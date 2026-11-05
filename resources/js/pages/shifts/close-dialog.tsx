import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { DenominationCounter } from '@/components/shifts/denomination-counter';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PaymentBreakdownRow } from '@/lib/reports';
import { formatPeso } from '@/lib/money';
import { close } from '@/routes/shifts';

import { ShiftPaymentsSummary } from '@/pages/shifts/shift-payments-summary';

type Props = {
    shiftId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Shown to managers closing their own shift (cashiers stay blind). */
    closePreviewCents?: number | null;
    payments?: PaymentBreakdownRow[];
    nonCashNetCents?: number;
};

/** Count the drawer by bills and coins. The server works out the expected cash and the difference. */
export function CloseShiftDialog({ shiftId, open, onOpenChange, closePreviewCents, payments = [], nonCashNetCents = 0 }: Props) {
    const [counted, setCounted] = useState(0);
    const form = useForm({ notes: '' });

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({ counted_cash_cents: counted, notes: data.notes.trim() || null }));
        form.post(close.url(shiftId), {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                form.reset();
            },
        });
    }

    const errors = form.errors as Record<string, string | undefined>;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Close shift</DialogTitle>
                        <DialogDescription>
                            Count every bill and coin in the drawer, including opening cash. E-wallet and card payments are not in the drawer.
                        </DialogDescription>
                    </DialogHeader>

                    {(payments.length > 0 || nonCashNetCents > 0) && (
                        <div className="bg-muted/60 rounded-md border p-3">
                            <ShiftPaymentsSummary payments={payments} nonCashNetCents={nonCashNetCents} compact />
                        </div>
                    )}

                    {closePreviewCents != null && (
                        <p className="bg-muted rounded-md p-3 text-sm">
                            Expected in drawer (manager preview): <span className="font-semibold">{formatPeso(closePreviewCents)}</span>
                        </p>
                    )}

                    <DenominationCounter onChange={setCounted} resetKey={open} />

                    <p className="text-sm font-medium">Counted: {formatPeso(counted)}</p>

                    <div className="space-y-2">
                        <Label htmlFor="close-notes">Notes (optional)</Label>
                        <Textarea
                            id="close-notes"
                            rows={2}
                            maxLength={1000}
                            value={form.data.notes}
                            onChange={(event) => form.setData('notes', event.target.value)}
                        />
                    </div>

                    {(errors.counted_cash_cents || errors.shift) && (
                        <p className="text-destructive text-sm">{errors.counted_cash_cents ?? errors.shift}</p>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Close shift
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
