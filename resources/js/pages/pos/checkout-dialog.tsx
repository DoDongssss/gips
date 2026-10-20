import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Plus, Tag, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCan } from '@/hooks/use-can';
import { usePricedCart } from '@/hooks/use-priced-cart';
import { formatPeso } from '@/lib/money';
import { updateOrder } from '@/lib/order-edit';
import { createOrder, newIdempotencyKey } from '@/lib/pos-api';
import { errorFor, errorList } from '@/lib/pos-http';
import type { PayRow, PosOrderRow } from '@/lib/pos-session';
import { payOrder } from '@/lib/pos-session';
import { uuid } from '@/lib/uuid';
import { ApprovalFields, isApprovalComplete } from '@/pages/orders/approval-fields';
import type { OrderDetail, PosConfig } from '@/pages/orders/types';
import { DiscountDialog } from '@/pages/pos/discount-dialog';
import { buildCartPayload, useCartStore } from '@/stores/cart-store';
import { useOrderEdit } from '@/stores/order-edit-store';

type PayMethod = { code: string; name: string; type: string; requires_reference: boolean };
type Row = {
    uid: string;
    method: string;
    amount: string;
    reference: string;
    tip: string;
    /** Non-cash rows follow the remaining balance until the cashier types an amount. */
    auto: boolean;
};
type Attempt = { signature: string; key: string };
type Outcome = { number: string; paid: boolean; change: number; total: number };

type Props = {
    config: PosConfig | undefined;
    /** Set when paying a saved order instead of the cart. */
    order: PosOrderRow | null;
    onClose: () => void;
    onSaved: (orderNumber: string) => void;
};

const toCents = (value: string): number => {
    const n = Number(value);

    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};

const toPesos = (cents: number): string => (cents / 100).toFixed(2);

/**
 * Works out what the payment rows add up to, exactly like the server does:
 * cash is capped at the balance and the rest is change; other methods cannot exceed the balance.
 */
function settle(rows: Row[], methods: PayMethod[], total: number) {
    let outstanding = total;
    let change = 0;
    let blocked = false;
    let tooMuch = false;
    const before: number[] = [];
    const shown: number[] = [];
    const payments: PayRow[] = [];

    rows.forEach((row) => {
        before.push(outstanding);
        const method = methods.find((m) => m.code === row.method);
        const isCash = method?.type === 'cash';
        const value = !isCash && row.auto ? Math.max(outstanding, 0) : toCents(row.amount);
        const tip = toCents(row.tip);
        shown.push(value);

        if (!method || value <= 0) {
            return;
        }

        if (outstanding <= 0) {
            tooMuch = true;

            return;
        }

        if (isCash) {
            if (value - tip <= 0) {
                return;
            }

            const applied = Math.min(value - tip, outstanding);
            change += value - applied - tip;
            outstanding -= applied;
            payments.push({ method: method.code, tendered_cents: value, ...(tip > 0 ? { tip_cents: tip } : {}) });

            return;
        }

        if (value > outstanding) {
            tooMuch = true;

            return;
        }

        if (method.requires_reference && row.reference.trim() === '') {
            blocked = true;
        }

        outstanding -= value;
        payments.push({
            method: method.code,
            amount_cents: value,
            reference_no: row.reference.trim() || undefined,
            ...(tip > 0 ? { tip_cents: tip } : {}),
        });
    });

    return { payments, before, shown, remaining: outstanding, change, blocked, tooMuch };
}

/** Handy cash amounts: the exact balance, then the next round bills. */
function quickAmounts(due: number): number[] {
    const options = [due];

    for (const step of [5000, 10000, 50000, 100000]) {
        const rounded = Math.ceil(due / step) * step;

        if (rounded > due && !options.includes(rounded)) {
            options.push(rounded);
        }
    }

    return options.slice(0, 4);
}

export function CheckoutDialog({ config, order, onClose, onSaved }: Props) {
    const cart = useCartStore();
    const { can } = useCan();
    const queryClient = useQueryClient();
    const { summary, calculating, error: previewError } = usePricedCart({ exact: true });

    const methods = (config?.payment_methods ?? []) as PayMethod[];
    const [rows, setRows] = useState<Row[]>(() => [{ uid: uuid(), method: '', amount: '', reference: '', tip: '', auto: false }]);
    const [discountOpen, setDiscountOpen] = useState(false);
    const [extrasToggled, setExtrasToggled] = useState<boolean | null>(null);
    const [created, setCreated] = useState<OrderDetail | null>(null);
    const [done, setDone] = useState<Outcome | null>(null);

    const createdRef = useRef<OrderDetail | null>(null);
    const createAttempt = useRef<Attempt | null>(null);
    const payAttempt = useRef<Attempt | null>(null);

    const savedMode = order !== null;
    const cartMode = !savedMode && created === null;
    const total = order ? order.balance_cents : created ? created.balance_cents : (summary?.total_cents ?? 0);

    const effective = rows.map((row) => ({ ...row, method: row.method || methods[0]?.code || '' }));
    const result = settle(effective, methods, total);
    const payable = result.payments.length > 0 && result.remaining === 0 && !result.blocked && !result.tooMuch;
    const anyAmount = effective.some((row) => toCents(row.amount) > 0);

    const needsApproval = cartMode && cart.discounts.some((d) => d.requires_approval) && !can('discount.manage');
    const approvalReady = !needsApproval || isApprovalComplete(cart.approval);
    const cartReady = !cartMode || (!!summary && summary.lines.length === cart.lines.length && !calculating && !previewError);
    const canPay = can('payment.take');

    const submit = useMutation({
        mutationFn: async (action: 'pay' | 'save'): Promise<Outcome> => {
            let target = order
                ? { id: order.id, number: order.order_number }
                : createdRef.current
                  ? { id: createdRef.current.id, number: createdRef.current.order_number }
                  : null;

            if (!target) {
                // Create the order once. The same cart reuses the same key, so a retry never duplicates it.
                const payload = buildCartPayload(useCartStore.getState(), { withApproval: true });
                const signature = JSON.stringify(payload);

                if (createAttempt.current?.signature !== signature) {
                    createAttempt.current = { signature, key: newIdempotencyKey() };
                }

                // Editing a saved order updates that order; otherwise a new one is created.
                const editing = useOrderEdit.getState().editing;
                const made = editing ? await updateOrder(editing.id, payload, createAttempt.current.key) : await createOrder(payload, createAttempt.current.key);

                if (editing) {
                    useOrderEdit.getState().stop();
                }

                createdRef.current = made;
                createAttempt.current = null;
                setCreated(made);
                cart.clear();
                target = { id: made.id, number: made.order_number };
            }

            if (action === 'save') {
                return { number: target.number, paid: false, change: 0, total };
            }

            const signature = JSON.stringify([target.id, result.payments]);

            if (payAttempt.current?.signature !== signature) {
                payAttempt.current = { signature, key: newIdempotencyKey() };
            }

            await payOrder(target.id, result.payments, payAttempt.current.key);

            return { number: target.number, paid: true, change: result.change, total };
        },
        onSuccess: (outcome) => {
            void queryClient.invalidateQueries({ queryKey: ['pos'] });

            if (outcome.paid) {
                setDone(outcome);
            } else {
                onSaved(outcome.number);
            }
        },
        onError: () => {
            // The order may have been created even if payment failed.
            void queryClient.invalidateQueries({ queryKey: ['pos'] });
        },
    });

    function close() {
        if (submit.isPending) {
            return;
        }

        // Closed after the order was created but before it was paid: it stays saved as unpaid.
        if (createdRef.current && !done) {
            onSaved(createdRef.current.order_number);

            return;
        }

        onClose();
    }

    function patchRow(index: number, change: Partial<Row>) {
        setRows((current) => current.map((row, i) => (i === index ? { ...row, ...change } : row)));
    }

    function chooseMethod(index: number, code: string) {
        const method = methods.find((m) => m.code === code);
        const isCash = method?.type === 'cash';

        patchRow(index, { method: code, reference: '', amount: '', auto: !isCash && method !== undefined });
    }

    function addRow() {
        const next = methods.find((m) => !effective.some((row) => row.method === m.code)) ?? methods[0];
        const isCash = next?.type === 'cash';

        setRows((current) => [
            ...current,
            { uid: uuid(), method: next?.code ?? '', amount: '', reference: '', tip: '', auto: !isCash },
        ]);
    }

    function onSubmit(event: FormEvent) {
        event.preventDefault();

        if (payable && cartReady && approvalReady && canPay && !submit.isPending) {
            submit.mutate('pay');
        }
    }

    /* ---------------- Paid: confirmation ---------------- */
    if (done) {
        return (
            <Dialog open onOpenChange={(open) => !open && onClose()}>
                <DialogContent showCloseButton={false} className="gap-3 rounded-2xl border-0 bg-white p-5 shadow-2xl sm:max-w-sm">
                    <div className="flex flex-col items-center gap-1 py-2 text-center">
                        <span className="mb-1 grid size-16 place-items-center rounded-full bg-gradient-to-br from-green-100 to-emerald-100"><Check className="size-8 text-green-600" /></span>
                        <DialogHeader className="items-center gap-0">
                            <DialogTitle className="text-lg">Payment complete</DialogTitle>
                            <DialogDescription className="text-sm">Order number</DialogDescription>
                        </DialogHeader>
                        <p className="text-5xl font-bold tracking-tight text-blue-600">{done.number}</p>

                        <div className="mt-2 w-full space-y-0.5 border-t pt-2 text-base">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Paid</span>
                                <span className="font-medium tabular-nums">{formatPeso(done.total)}</span>
                            </div>
                            {done.change > 0 && (
                                <div className="flex items-baseline justify-between">
                                    <span className="text-muted-foreground">Change</span>
                                    <span className="text-3xl font-semibold tabular-nums">{formatPeso(done.change)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button className="h-14 w-full" autoFocus onClick={onClose}>
                            New sale
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    /* ---------------- Checkout form ---------------- */
    const discountAmount = (discountId: number) => summary?.discounts.find((d) => d.discount_id === discountId && d.item_index === null)?.amount_cents;
    const extrasOpen = extrasToggled ?? (cart.discounts.length > 0 || needsApproval);

    return (
        <>
            <Dialog open onOpenChange={(open) => !open && close()}>
                <DialogContent showCloseButton={false} className="max-h-[94vh] gap-4 overflow-y-auto rounded-2xl border-0 bg-white p-5 shadow-2xl sm:max-w-lg">
                    <form onSubmit={onSubmit} className="space-y-3">
                        <DialogHeader className="gap-0.5 rounded-lg bg-gray-50 p-4">
                            <div className="flex items-baseline justify-between gap-2">
                                <DialogTitle className="text-lg">{savedMode ? `Pay order ${order?.order_number}` : 'Pay'}</DialogTitle>
                                <span className="text-4xl font-bold text-blue-600 tabular-nums">{formatPeso(total)}</span>
                            </div>
                            <DialogDescription className="text-sm">
                                {cartMode && summary ? (
                                    <>
                                        Subtotal {formatPeso(summary.subtotal_cents)}
                                        {summary.discount_cents > 0 && ` · Discounts −${formatPeso(summary.discount_cents)}`}
                                        {summary.taxes[0] && ` · ${summary.taxes[0].name} ${formatPeso(summary.taxes[0].tax_cents)}`}
                                    </>
                                ) : (
                                    'Balance due'
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        {/* Payments */}
                        <section className="space-y-2">
                            {effective.map((row, index) => {
                                const method = methods.find((m) => m.code === row.method);
                                const isCash = method?.type === 'cash';
                                const due = result.before[index] ?? total;

                                return (
                                    <div key={row.uid} className="space-y-2 border-t pt-2 first:border-t-0 first:pt-0">
                                        <div className="flex items-center gap-1.5">
                                            {methods.length > 4 ? (
                                                <Select value={row.method} onValueChange={(code) => chooseMethod(index, code)}>
                                                    <SelectTrigger className="h-11 flex-1" aria-label="Payment method">
                                                        <SelectValue placeholder="Choose a method" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {methods.map((m) => (
                                                            <SelectItem key={m.code} value={m.code}>
                                                                {m.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <div className="flex flex-1 gap-1.5" role="group" aria-label="Payment method">
                                                    {methods.map((m) => (
                                                        <Button
                                                            key={m.code}
                                                            type="button"
                                                            size="sm"
                                                            className="h-12 flex-1 text-base"
                                                            variant={row.method === m.code ? 'default' : 'outline'}
                                                            aria-pressed={row.method === m.code}
                                                            onClick={() => chooseMethod(index, m.code)}
                                                        >
                                                            {m.name}
                                                        </Button>
                                                    ))}
                                                </div>
                                            )}
                                            {rows.length > 1 && (
                                                <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Remove payment" onClick={() => setRows((current) => current.filter((_, i) => i !== index))}>
                                                    <Trash2 className="text-muted-foreground size-5" />
                                                </Button>
                                            )}
                                        </div>

                                        <Input
                                            id={`pay-amount-${row.uid}`}
                                            className="h-12 text-lg"
                                            inputMode="decimal"
                                            placeholder={isCash ? 'Amount received' : 'Amount'}
                                            aria-label={isCash ? 'Amount received' : 'Amount'}
                                            autoFocus={index === 0}
                                            value={!isCash && row.auto ? (result.shown[index] > 0 ? toPesos(result.shown[index]) : '') : row.amount}
                                            onChange={(event) => patchRow(index, { amount: event.target.value.replace(/[^0-9.]/g, ''), auto: false })}
                                        />

                                        {isCash && due > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {quickAmounts(due).map((amount, i) => (
                                                    <Button key={amount} type="button" variant="outline" size="sm" className="h-10" onClick={() => patchRow(index, { amount: toPesos(amount + toCents(row.tip)) })}>
                                                        {i === 0 ? 'Exact' : formatPeso(amount)}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}

                                        <Input
                                            id={`pay-tip-${row.uid}`}
                                            className="h-11"
                                            inputMode="decimal"
                                            placeholder="Tip (optional)"
                                            aria-label="Tip (optional)"
                                            value={row.tip}
                                            onChange={(event) => patchRow(index, { tip: event.target.value.replace(/[^0-9.]/g, '') })}
                                        />

                                        {method?.requires_reference && (
                                            <Input
                                                id={`pay-ref-${row.uid}`}
                                                className="h-11"
                                                maxLength={100}
                                                placeholder="Reference number"
                                                aria-label="Reference number"
                                                value={row.reference}
                                                onChange={(event) => patchRow(index, { reference: event.target.value })}
                                            />
                                        )}
                                    </div>
                                );
                            })}

                            {/* Change and balance, updated as the cashier types */}
                            {result.change > 0 && (
                                <div className="flex items-baseline justify-between border-t pt-2">
                                    <span className="text-muted-foreground text-base">Change</span>
                                    <span className="text-3xl font-bold text-green-600 tabular-nums" aria-live="polite">
                                        {formatPeso(result.change)}
                                    </span>
                                </div>
                            )}
                            {anyAmount && result.remaining > 0 && (
                                <p className="text-destructive text-sm font-medium" aria-live="polite">
                                    {formatPeso(result.remaining)} still to pay.
                                </p>
                            )}
                            {result.tooMuch && <p className="text-destructive text-sm">A payment is more than the balance.</p>}

                            {result.remaining > 0 && methods.length > 1 && rows.length < 4 && (
                                <Button type="button" variant="ghost" size="sm" className="h-10" onClick={addRow}>
                                    <Plus className="size-5" /> Split payment
                                </Button>
                            )}
                        </section>

                        {/* Discounts, customer and notes */}
                        {cartMode && (
                            <Collapsible open={extrasOpen} onOpenChange={setExtrasToggled} className="border-t pt-2">
                                <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between text-sm font-medium">
                                    <span className="flex items-center gap-1.5">
                                        <Tag className="size-5" /> Discount, customer, notes
                                        {cart.discounts.length > 0 && ` (${cart.discounts.length})`}
                                    </span>
                                    <ChevronDown className={`size-5 transition ${extrasOpen ? 'rotate-180' : ''}`} />
                                </CollapsibleTrigger>

                                <CollapsibleContent className="space-y-2 pt-2">
                                    {cart.discounts.map((d) => {
                                        const amount = d.line_uid === null ? discountAmount(d.discount_id) : undefined;
                                        const line = d.line_uid ? cart.lines.find((l) => l.uid === d.line_uid) : null;

                                        return (
                                            <div key={d.uid} className="flex items-center justify-between rounded border px-2 py-1.5 text-base">
                                                <span>
                                                    {d.name}
                                                    {line && <span className="text-muted-foreground"> · {line.name}</span>}
                                                    {amount !== undefined && <span className="text-muted-foreground"> · −{formatPeso(amount)}</span>}
                                                </span>
                                                <button type="button" className="text-muted-foreground hover:text-destructive text-sm" onClick={() => cart.removeDiscount(d.uid)}>
                                                    Remove
                                                </button>
                                            </div>
                                        );
                                    })}

                                    <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => setDiscountOpen(true)}>
                                        <Plus className="size-5" /> Add discount
                                    </Button>

                                    {needsApproval && (
                                        <ApprovalFields
                                            approvers={config?.approvers ?? []}
                                            value={cart.approval}
                                            onChange={cart.setApproval}
                                            error={errorFor(submit.error, 'approval')}
                                            idPrefix="checkout-approval"
                                        />
                                    )}

                                    <Input id="checkout-customer" className="h-11" maxLength={100} placeholder="Customer name (optional)" aria-label="Customer name (optional)" value={cart.customerName} onChange={(event) => cart.setCustomerName(event.target.value)} />
                                    <Textarea id="checkout-notes" rows={2} maxLength={500} placeholder="Order notes (optional)" aria-label="Order notes (optional)" value={cart.notes} onChange={(event) => cart.setNotes(event.target.value)} />
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        {(submit.isError || (cartMode && previewError)) && (
                            <div className="text-destructive space-y-1 text-sm" role="alert">
                                {errorList(submit.isError ? submit.error : previewError).map((message) => (
                                    <p key={message}>{message}</p>
                                ))}
                            </div>
                        )}

                        <DialogFooter className="gap-1.5 sm:gap-1.5">
                            <Button type="button" variant="ghost" className="h-12" onClick={close}>
                                {created ? 'Close (saved unpaid)' : 'Cancel'}
                            </Button>
                            {cartMode && (
                                <Button type="button" variant="outline" className="h-12" disabled={!cartReady || !approvalReady || submit.isPending} onClick={() => submit.mutate('save')}>
                                    Save, pay later
                                </Button>
                            )}
                            {canPay && (
                                <Button type="submit" className="h-14 flex-1 " disabled={!payable || !cartReady || !approvalReady || submit.isPending}>
                                    {submit.isPending ? 'Processing…' : 'Complete sale'}
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <DiscountDialog open={discountOpen} discounts={config?.discounts ?? []} lines={cart.lines} onClose={() => setDiscountOpen(false)} onAdd={cart.addDiscount} />
        </>
    );
}
