import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { errorMessages, fieldError } from '@/lib/api';
import { centsToPesos, formatPeso, pesosToCents } from '@/lib/money';
import { newIdempotencyKey, refundPayment } from '@/lib/pos-api';
import type { Approval } from '@/lib/pos-api';
import { ApprovalFields, isApprovalComplete } from '@/pages/orders/approval-fields';
import type { Approver, OrderDetail, OrderPayment } from '@/pages/orders/types';

type Props = {
    order: OrderDetail;
    /** The payment being refunded, or null when the dialog is closed. */
    payment: OrderPayment | null;
    approvers: Approver[];
    /** True when the signed-in person cannot refund alone and needs a manager's PIN. */
    needsApproval: boolean;
    onClose: () => void;
    onDone: (order: OrderDetail) => void;
};

/** Refund part or all of one payment. The same request reuses one idempotency key so a double tap cannot refund twice. */
export function RefundDialog({ order, payment, approvers, needsApproval, onClose, onDone }: Props) {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [approval, setApproval] = useState<Approval | null>(null);
    const keyRef = useRef<{ signature: string; key: string } | null>(null);

    const available = payment ? payment.amount_cents - (payment.refunded_cents ?? 0) : 0;
    const cents = amount.trim() === '' ? 0 : pesosToCents(amount);

    const refund = useMutation({
        mutationFn: () => {
            const body = {
                payment_id: payment!.id,
                amount_cents: cents,
                reason: reason.trim(),
                ...(needsApproval && isApprovalComplete(approval) ? { approval } : {}),
            };
            const signature = JSON.stringify(body);

            if (keyRef.current?.signature !== signature) {
                keyRef.current = { signature, key: newIdempotencyKey() };
            }

            return refundPayment(order.id, body, keyRef.current.key);
        },
        onSuccess: (updated) => onDone(updated),
    });

    useEffect(() => {
        if (payment) {
            setAmount(centsToPesos(Math.max(payment.amount_cents - (payment.refunded_cents ?? 0), 0)));
            setReason('');
            setApproval(null);
            keyRef.current = null;
            refund.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payment?.id]);

    function submit(event: FormEvent) {
        event.preventDefault();
        refund.mutate();
    }

    const ready = cents > 0 && cents <= available && reason.trim() !== '' && (!needsApproval || isApprovalComplete(approval));
    const amountError = fieldError(refund.error, 'amount_cents');
    const reasonError = fieldError(refund.error, 'reason');
    const approvalError = fieldError(refund.error, 'approval');
    const general = refund.isError
        ? errorMessages(refund.error).filter((m) => m !== amountError && m !== reasonError && m !== approvalError)
        : [];

    return (
        <Dialog open={payment !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>
                            Refund · {payment?.method ?? 'Payment'} · {order.order_number}
                        </DialogTitle>
                        <DialogDescription>
                            Up to {formatPeso(available)} can be returned on this payment. Cash refunds come out of the drawer.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-1.5">
                        <Label htmlFor="refund-amount">Amount (₱)</Label>
                        <div className="flex gap-2">
                            <Input
                                id="refund-amount"
                                inputMode="decimal"
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                                autoFocus
                            />
                            <Button type="button" variant="outline" onClick={() => setAmount(centsToPesos(available))}>
                                Full
                            </Button>
                        </div>
                        {cents > available && <p className="text-destructive text-sm">That is more than what is left to refund.</p>}
                        {amountError && <p className="text-destructive text-sm">{amountError}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="refund-reason">Reason</Label>
                        <Textarea id="refund-reason" rows={3} maxLength={255} value={reason} onChange={(event) => setReason(event.target.value)} />
                        {reasonError && <p className="text-destructive text-sm">{reasonError}</p>}
                    </div>

                    {needsApproval && <ApprovalFields approvers={approvers} value={approval} onChange={setApproval} error={approvalError} idPrefix="refund-approval" />}

                    {general.length > 0 && (
                        <div className="text-destructive space-y-1 text-sm" role="alert">
                            {general.map((m) => (
                                <p key={m}>{m}</p>
                            ))}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="destructive" disabled={!ready || refund.isPending}>
                            {refund.isPending ? 'Refunding…' : `Refund ${formatPeso(cents)}`}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
