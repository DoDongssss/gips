import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { DenominationCounter } from '@/components/shifts/denomination-counter';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { close } from '@/routes/shifts';

type Props = {
    shiftId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

/** Count the drawer by bills and coins. The server works out the expected cash and the difference. */
export function CloseShiftDialog({ shiftId, open, onOpenChange }: Props) {
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
                        <DialogDescription>Count all the cash in the drawer, including the opening cash.</DialogDescription>
                    </DialogHeader>

                    <DenominationCounter onChange={setCounted} resetKey={open} />

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
