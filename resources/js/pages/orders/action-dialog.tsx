import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { errorMessages, fieldError } from '@/lib/api';
import { orderAction } from '@/lib/pos-api';
import type { Approval } from '@/lib/pos-api';
import { ApprovalFields, isApprovalComplete } from '@/pages/orders/approval-fields';
import type { Approver, OrderDetail } from '@/pages/orders/types';

type Props = {
    mode: 'cancel' | 'void' | null;
    order: OrderDetail;
    approvers: Approver[];
    /** True when the signed-in person cannot void alone and needs a manager's PIN. */
    needsApproval: boolean;
    onClose: () => void;
    onDone: (order: OrderDetail) => void;
};

const copy = {
    cancel: {
        title: 'Cancel order',
        description: 'Cancels an unpaid order. Its items are released and nothing is charged.',
        button: 'Cancel order',
    },
    void: {
        title: 'Void order',
        description: 'Voids the sale and its payments. Refund records and the cash drawer arrive in a later phase.',
        button: 'Void order',
    },
} as const;

/** Cancel (unpaid orders) and void (paid orders) both need a reason; void can also need a manager PIN. */
export function ActionDialog({ mode, order, approvers, needsApproval, onClose, onDone }: Props) {
    const [reason, setReason] = useState('');
    const [approval, setApproval] = useState<Approval | null>(null);

    const action = useMutation({
        mutationFn: () =>
            orderAction(order.id, mode!, {
                reason: reason.trim(),
                ...(mode === 'void' && needsApproval && isApprovalComplete(approval) ? { approval } : {}),
            }),
        onSuccess: (updated) => onDone(updated),
    });

    useEffect(() => {
        if (mode) {
            setReason('');
            setApproval(null);
            action.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    function submit(event: FormEvent) {
        event.preventDefault();
        action.mutate();
    }

    const text = mode ? copy[mode] : copy.cancel;
    const approvalNeeded = mode === 'void' && needsApproval;
    const ready = reason.trim() !== '' && (!approvalNeeded || isApprovalComplete(approval));

    const reasonError = fieldError(action.error, 'reason');
    // Anything that is not about the reason or the approval fields (for example "cannot cancel a paid order").
    const generalErrors = action.isError
        ? errorMessages(action.error).filter((message) => message !== reasonError && message !== fieldError(action.error, 'approval'))
        : [];

    return (
        <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>
                            {text.title} · {order.order_number}
                        </DialogTitle>
                        <DialogDescription>{text.description}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="action-reason">Reason</Label>
                        <Textarea
                            id="action-reason"
                            rows={3}
                            maxLength={255}
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            autoFocus
                        />
                        {reasonError && <p className="text-destructive text-sm">{reasonError}</p>}
                    </div>

                    {approvalNeeded && (
                        <ApprovalFields
                            approvers={approvers}
                            value={approval}
                            onChange={setApproval}
                            error={fieldError(action.error, 'approval')}
                            idPrefix="void-approval"
                        />
                    )}

                    {generalErrors.length > 0 && (
                        <div className="text-destructive space-y-1 text-sm" role="alert">
                            {generalErrors.map((message) => (
                                <p key={message}>{message}</p>
                            ))}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Keep order
                        </Button>
                        <Button type="submit" variant="destructive" disabled={!ready || action.isPending}>
                            {action.isPending ? 'Working…' : text.button}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
