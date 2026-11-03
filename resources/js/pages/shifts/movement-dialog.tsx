import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { pesosToCents } from '@/lib/money';
import { store } from '@/routes/shifts/movements';

type Props = {
    shiftId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

type FormData = { type: string; amount: string; reason: string };

const blank: FormData = { type: 'cash_out', amount: '', reason: '' };

const TYPES = [
    { value: 'cash_in', label: 'Cash in', hint: 'Add money to the drawer, for example more change.' },
    { value: 'cash_out', label: 'Cash out', hint: 'Take money out for a purchase.' },
    { value: 'drop', label: 'Safe drop', hint: 'Move extra cash from the drawer to the safe.' },
    { value: 'payout', label: 'Payout', hint: 'Pay a supplier or staff from the drawer.' },
];

/** Cash in, cash out, safe drop or payout. Every one needs a reason. */
export function MovementDialog({ shiftId, open, onOpenChange }: Props) {
    const form = useForm<FormData>(blank);

    useEffect(() => {
        if (open) {
            form.setData(blank);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({ type: data.type, amount_cents: pesosToCents(data.amount), reason: data.reason.trim() }));
        form.post(store.url(shiftId), { preserveScroll: true, onSuccess: () => onOpenChange(false) });
    }

    const hint = TYPES.find((type) => type.value === form.data.type)?.hint;
    const errors = form.errors as Record<string, string | undefined>;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Cash movement</DialogTitle>
                        <DialogDescription>{hint}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="movement-type">Type</Label>
                        <Select value={form.data.type} onValueChange={(value) => form.setData('type', value)}>
                            <SelectTrigger id="movement-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.type && <p className="text-destructive text-sm">{errors.type}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="movement-amount">Amount (₱)</Label>
                        <Input
                            id="movement-amount"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={form.data.amount}
                            onChange={(event) => form.setData('amount', event.target.value)}
                            autoFocus
                        />
                        {errors.amount_cents && <p className="text-destructive text-sm">{errors.amount_cents}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="movement-reason">Reason</Label>
                        <Input
                            id="movement-reason"
                            maxLength={255}
                            value={form.data.reason}
                            onChange={(event) => form.setData('reason', event.target.value)}
                        />
                        {errors.reason && <p className="text-destructive text-sm">{errors.reason}</p>}
                    </div>

                    {errors.shift && <p className="text-destructive text-sm">{errors.shift}</p>}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing || pesosToCents(form.data.amount) <= 0 || form.data.reason.trim() === ''}>
                            Record
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
