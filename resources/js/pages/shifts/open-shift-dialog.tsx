import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { pesosToCents } from '@/lib/money';
import { store } from '@/routes/shifts';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

/** Opening a shift starts the drawer with the cash (the "float") the cashier was handed. */
export default function OpenShiftDialog({ open, onOpenChange }: Props) {
    const form = useForm({ opening_cash: '' });

    useEffect(() => {
        if (open) {
            form.reset();
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            opening_cash_cents: data.opening_cash.trim() === '' ? 0 : pesosToCents(data.opening_cash),
        }));

        form.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    }

    const error = (form.errors as Record<string, string>).opening_cash_cents;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Open shift</DialogTitle>
                        <DialogDescription>Count the cash in the drawer and enter it as the opening float.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-1.5">
                        <Label htmlFor="opening-cash">Opening cash (₱)</Label>
                        <Input
                            id="opening-cash"
                            inputMode="decimal"
                            placeholder="0.00"
                            autoFocus
                            value={form.data.opening_cash}
                            onChange={(event) => form.setData('opening_cash', event.target.value)}
                        />
                        {error && <p className="text-destructive text-sm">{error}</p>}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Opening…' : 'Open shift'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
