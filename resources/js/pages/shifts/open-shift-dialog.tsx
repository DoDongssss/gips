import { useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { DenominationCounter } from '@/components/shifts/denomination-counter';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatPeso } from '@/lib/money';
import { store } from '@/routes/shifts';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

/** Opening a shift starts the drawer with the cash (the "float") the cashier was handed. */
export default function OpenShiftDialog({ open, onOpenChange }: Props) {
    const [counted, setCounted] = useState(0);
    const form = useForm({ device_id: null as number | null });

    useEffect(() => {
        if (open) {
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            opening_cash_cents: counted,
            device_id: data.device_id,
        }));

        form.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    }

    const errors = form.errors as Record<string, string | undefined>;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Open shift</DialogTitle>
                        <DialogDescription>Count the cash in the drawer. This becomes your opening float.</DialogDescription>
                    </DialogHeader>

                    <DenominationCounter onChange={setCounted} resetKey={open} />

                    <p className="text-sm font-medium">Opening total: {formatPeso(counted)}</p>

                    {errors.opening_cash_cents && <p className="text-destructive text-sm">{errors.opening_cash_cents}</p>}
                    {errors.shift && <p className="text-destructive text-sm">{errors.shift}</p>}

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
