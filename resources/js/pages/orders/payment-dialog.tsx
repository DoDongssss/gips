import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { errorMessages, fieldError } from '@/lib/api';
import { centsToPesos, formatPeso, pesosToCents } from '@/lib/money';
import { newIdempotencyKey, takePayments } from '@/lib/pos-api';
import type { PaymentInput } from '@/lib/pos-api';
import { printReceipt, ReceiptView } from '@/pages/orders/receipt';
import type { OrderDetail, PaymentMethodOption } from '@/pages/orders/types';

type Line = {
    uid: string;
    method: string;
    /** Non-cash: the amount charged. */
    amount: string;
    /** Cash: what the customer handed over. */
    tendered: string;
    tip: string;
    reference: string;
};

type Props = {
    /** The order to pay. Null keeps the dialog closed. */
    order: OrderDetail | null;
    methods: PaymentMethodOption[];
    /** Called when the dialog closes. `updated` is the order after payment, or null if nothing was paid. */
    onClose: (updated: OrderDetail | null) => void;
};

const MAX_LINES = 5;
const QUICK_CASH = [100, 200, 500, 1000];

const cents = (value: string) => (value.trim() === '' ? 0 : pesosToCents(value));

export function PaymentDialog({ order, methods, onClose }: Props) {
    const [lines, setLines] = useState<Line[]>([]);
    const [result, setResult] = useState<OrderDetail | null>(null);
    const attempt = useRef<{ signature: string; key: string } | null>(null);

    const balance = order?.balance_cents ?? 0;
    const firstMethod = methods.find((m) => m.type === 'cash') ?? methods[0];

    // Fresh state each time a different order opens.
    useEffect(() => {
        if (!order || !firstMethod) {
            return;
        }

        setLines([{ uid: crypto.randomUUID(), method: firstMethod.code, amount: '', tendered: '', tip: '', reference: '' }]);
        setResult(null);
        attempt.current = null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order?.id]);

    const methodOf = (code: string) => methods.find((m) => m.code === code);

    // What each line would settle, worked out the same way the server does it.
    const computed = useMemo(() => {
        let remaining = balance;

        return lines.map((line) => {
            const method = methodOf(line.method);
            const tip = cents(line.tip);

            if (method?.type === 'cash') {
                const tendered = cents(line.tendered);
                const applied = Math.max(0, Math.min(tendered - tip, remaining));
                const change = applied > 0 ? tendered - applied - tip : 0;
                remaining -= applied;

                return { applied, change, tip, tendered };
            }

            const applied = Math.min(cents(line.amount), Math.max(remaining, 0));
            remaining -= applied;

            return { applied, change: 0, tip, tendered: 0 };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lines, balance, methods]);

    const totalApplied = computed.reduce((sum, c) => sum + c.applied, 0);
    const totalChange = computed.reduce((sum, c) => sum + c.change, 0);
    const remaining = balance - totalApplied;

    const body = useMemo<PaymentInput[]>(
        () =>
            lines
                .map((line, index): PaymentInput | null => {
                    const method = methodOf(line.method);
                    const c = computed[index];

                    if (!method || (method.type === 'cash' ? c.tendered <= 0 : cents(line.amount) <= 0)) {
                        return null;
                    }

                    const payment: PaymentInput =
                        method.type === 'cash'
                            ? { method: line.method, tendered_cents: c.tendered }
                            : { method: line.method, amount_cents: cents(line.amount) };

                    if (c.tip > 0) {
                        payment.tip_cents = c.tip;
                    }

                    if (line.reference.trim() !== '') {
                        payment.reference_no = line.reference.trim();
                    }

                    return payment;
                })
                .filter((payment): payment is PaymentInput => payment !== null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [lines, computed, methods],
    );

    const pay = useMutation({
        mutationFn: () => {
            // The same request body keeps the same key, so a retry after a dropped connection
            // can never charge twice. Any change to the payment starts a new key.
            const signature = JSON.stringify(body);

            if (attempt.current?.signature !== signature) {
                attempt.current = { signature, key: newIdempotencyKey() };
            }

            return takePayments(order!.id, body, attempt.current.key);
        },
        onSuccess: (updated) => {
            attempt.current = null;
            setResult(updated);
        },
    });

    function patch(uid: string, changes: Partial<Line>) {
        pay.reset();
        setLines((current) => current.map((line) => (line.uid === uid ? { ...line, ...changes } : line)));
    }

    function changeMethod(uid: string, code: string) {
        const method = methodOf(code);
        const others = computed.reduce((sum, c, i) => (lines[i].uid === uid ? sum : sum + c.applied), 0);

        // Cards and e-wallets usually take the whole remaining amount: prefill it.
        patch(uid, {
            method: code,
            tendered: '',
            amount: method && method.type !== 'cash' ? centsToPesos(Math.max(balance - others, 0)) : '',
            reference: '',
        });
    }

    function addLine() {
        const method = methods.find((m) => m.type !== 'cash') ?? methods[0];

        if (!method) {
            return;
        }

        setLines((current) => [
            ...current,
            {
                uid: crypto.randomUUID(),
                method: method.code,
                amount: method.type === 'cash' ? '' : centsToPesos(Math.max(remaining, 0)),
                tendered: '',
                tip: '',
                reference: '',
            },
        ]);
    }

    function close() {
        const paid = result ?? null;
        onClose(paid);
    }

    const open = order !== null;
    const receipt = result?.receipts?.find((r) => r.type === 'sale') ?? null;
    const missingReference = lines.some((line, i) => {
        const method = methodOf(line.method);

        return method?.requires_reference && computed[i].applied > 0 && line.reference.trim() === '';
    });

    return (
        <Dialog open={open} onOpenChange={(next) => !next && close()}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
                {order && result ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>{result.payment_status === 'paid' ? 'Payment received' : 'Partial payment received'}</DialogTitle>
                            <DialogDescription>
                                Order {result.order_number} · paid {formatPeso(result.paid_cents)} of {formatPeso(result.total_cents)}
                            </DialogDescription>
                        </DialogHeader>

                        {result.payment_status === 'paid' ? (
                            <div className="space-y-4">
                                {totalChange > 0 && (
                                    <div className="rounded-xl bg-emerald-50 p-5 text-center dark:bg-emerald-950/40">
                                        <p className="text-sm text-emerald-700 dark:text-emerald-300">Change due</p>
                                        <p className="text-4xl font-semibold tracking-tight text-emerald-800 dark:text-emerald-200">{formatPeso(totalChange)}</p>
                                    </div>
                                )}

                                {receipt && (
                                    <div className="max-h-72 overflow-y-auto rounded-md border bg-white p-2">
                                        <ReceiptView content={receipt.content} receiptNumber={receipt.receipt_number} />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm">Balance left to pay: {formatPeso(result.balance_cents)}.</p>
                        )}

                        <DialogFooter>
                            {receipt && (
                                <Button type="button" variant="outline" onClick={() => printReceipt(receipt.content, receipt.receipt_number)}>
                                    Print receipt
                                </Button>
                            )}
                            <Button type="button" className="bg-blue-600 text-white hover:bg-blue-700" onClick={close}>
                                Done
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    order && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Take payment · {order.order_number}</DialogTitle>
                                <DialogDescription>
                                    Total {formatPeso(order.total_cents)}
                                    {order.paid_cents > 0 && ` · already paid ${formatPeso(order.paid_cents)}`}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="rounded-xl bg-sky-50 p-5 text-center dark:bg-sky-950/40">
                                <p className="text-sm text-sky-700 dark:text-sky-300">Amount due</p>
                                <p className="text-4xl font-semibold tracking-tight text-sky-900 dark:text-sky-100">{formatPeso(balance)}</p>
                            </div>

                            <div className="space-y-3">
                                {lines.map((line, index) => {
                                    const method = methodOf(line.method);
                                    const c = computed[index];
                                    const isCash = method?.type === 'cash';
                                    const lineError = fieldError(pay.error, `payments.${index}`);

                                    return (
                                        <div key={line.uid} className="space-y-3 rounded-xl border border-sky-100 p-3 dark:border-sky-900">
                                            <div className="flex items-end gap-2">
                                                <div className="flex-1 space-y-1.5">
                                                    <Label>Method</Label>
                                                    <Select value={line.method} onValueChange={(code) => changeMethod(line.uid, code)}>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {methods.map((m) => (
                                                                <SelectItem key={m.code} value={m.code}>
                                                                    {m.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {lines.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setLines((current) => current.filter((l) => l.uid !== line.uid))}
                                                    >
                                                        Remove
                                                    </Button>
                                                )}
                                            </div>

                                            {isCash ? (
                                                <div className="space-y-2">
                                                    <Label htmlFor={`tendered-${line.uid}`}>Cash received</Label>
                                                    <Input
                                                        id={`tendered-${line.uid}`}
                                                        inputMode="decimal"
                                                        placeholder="0.00"
                                                        value={line.tendered}
                                                        onChange={(event) => patch(line.uid, { tendered: event.target.value })}
                                                        autoFocus={index === 0}
                                                    />
                                                    <div className="flex flex-wrap gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="rounded-full border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100"
                                                            onClick={() => patch(line.uid, { tendered: centsToPesos(Math.max(remaining + c.applied, 0)) })}
                                                        >
                                                            Exact
                                                        </Button>
                                                        {QUICK_CASH.map((pesos) => (
                                                            <Button
                                                                key={pesos}
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                className="rounded-full border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100"
                                                                onClick={() => patch(line.uid, { tendered: String(pesos) })}
                                                            >
                                                                ₱{pesos}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                    {c.change > 0 && (
                                                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Change: {formatPeso(c.change)}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor={`amount-${line.uid}`}>Amount</Label>
                                                        <Input
                                                            id={`amount-${line.uid}`}
                                                            inputMode="decimal"
                                                            placeholder="0.00"
                                                            value={line.amount}
                                                            onChange={(event) => patch(line.uid, { amount: event.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor={`ref-${line.uid}`}>
                                                            Reference no.{method?.requires_reference ? '' : ' (optional)'}
                                                        </Label>
                                                        <Input
                                                            id={`ref-${line.uid}`}
                                                            value={line.reference}
                                                            onChange={(event) => patch(line.uid, { reference: event.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-1.5 sm:max-w-40">
                                                <Label htmlFor={`tip-${line.uid}`}>Tip (optional)</Label>
                                                <Input
                                                    id={`tip-${line.uid}`}
                                                    inputMode="decimal"
                                                    placeholder="0.00"
                                                    value={line.tip}
                                                    onChange={(event) => patch(line.uid, { tip: event.target.value })}
                                                />
                                            </div>

                                            {lineError && <p className="text-destructive text-sm">{lineError}</p>}
                                        </div>
                                    );
                                })}

                                {lines.length < MAX_LINES && remaining > 0 && (
                                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                                        Split with another method
                                    </Button>
                                )}
                            </div>

                            {pay.isError && (
                                <div className="text-destructive space-y-1 text-sm" role="alert">
                                    {errorMessages(pay.error).map((message) => (
                                        <p key={message}>{message}</p>
                                    ))}
                                </div>
                            )}

                            <DialogFooter className="items-center sm:justify-between">
                                <p className="text-muted-foreground text-sm">
                                    {remaining > 0 && totalApplied > 0
                                        ? `${formatPeso(remaining)} will remain unpaid`
                                        : remaining === 0 && totalApplied > 0
                                          ? 'Covers the full amount'
                                          : 'Enter the amount received'}
                                </p>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={close}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                                        disabled={totalApplied <= 0 || missingReference || pay.isPending}
                                        onClick={() => pay.mutate()}
                                    >
                                        {pay.isPending
                                            ? 'Processing…'
                                            : remaining > 0
                                              ? `Take ${formatPeso(totalApplied)}`
                                              : `Pay ${formatPeso(totalApplied)}`}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </>
                    )
                )}
            </DialogContent>
        </Dialog>
    );
}
