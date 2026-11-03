import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Field } from '@/components/inventory/field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatQty } from '@/lib/inventory';
import { adjust } from '@/routes/inventory/ingredients';
import type { IngredientRow } from '@/types/inventory';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; ingredient?: IngredientRow };

/**
 * A manual correction, in the ingredient's base unit. Enter the new total OR the change:
 * most corrections come from "the shelf says 4,200 g", so the total is the default.
 */
export default function AdjustDialog({ open, onOpenChange, ingredient }: Props) {
    const form = useForm({ mode: 'total' as 'total' | 'change', value: '', notes: '' });
    const errors = form.errors as Record<string, string>;
    const unit = ingredient?.base_unit.abbreviation ?? '';
    const current = Number(ingredient?.quantity ?? 0);

    useEffect(() => {
        if (open) {
            form.reset();
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, ingredient?.id]);

    const entered = form.data.value.trim() === '' ? null : Number(form.data.value);
    const change = entered === null || Number.isNaN(entered) ? null : form.data.mode === 'total' ? Math.round((entered - current) * 10000) / 10000 : entered;

    function submit(event: FormEvent) {
        event.preventDefault();

        if (!ingredient) {
            return;
        }

        form.transform((data) => ({ quantity_change: change ?? '', notes: data.notes }));
        form.post(adjust.url(ingredient.id), { preserveScroll: true, onSuccess: () => onOpenChange(false) });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Adjust stock: {ingredient?.name}</DialogTitle>
                        <DialogDescription>
                            Now on hand: {formatQty(current)} {unit}. The correction is written to the stock history with your note.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-2">
                        <Button type="button" size="sm" variant={form.data.mode === 'total' ? 'default' : 'outline'} onClick={() => form.setData('mode', 'total')}>
                            Set new total
                        </Button>
                        <Button type="button" size="sm" variant={form.data.mode === 'change' ? 'default' : 'outline'} onClick={() => form.setData('mode', 'change')}>
                            Add / remove
                        </Button>
                    </div>

                    <Field
                        id="adj-value"
                        label={form.data.mode === 'total' ? `New total (${unit})` : `Change (${unit}), minus to remove`}
                        error={errors.quantity_change}
                        hint={change !== null && change !== 0 ? `This will ${change > 0 ? 'add' : 'remove'} ${formatQty(Math.abs(change))} ${unit}.` : undefined}
                    >
                        <Input id="adj-value" inputMode="decimal" autoFocus value={form.data.value} onChange={(e) => form.setData('value', e.target.value)} />
                    </Field>

                    <Field id="adj-notes" label="Reason" error={errors.notes}>
                        <Input id="adj-notes" placeholder="e.g. Recount after delivery" value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                    </Field>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing || change === null || change === 0}>
                            {form.processing ? 'Saving…' : 'Post adjustment'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
