import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Field } from '@/components/inventory/field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { unitsFor, useIngredientOptions } from '@/hooks/use-ingredient-options';
import { wasteReasonLabels } from '@/lib/inventory';
import { store } from '@/routes/inventory/waste';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Preselect an ingredient (the "Waste" button on a row). */
    ingredientId?: number;
};

const REASONS = Object.keys(wasteReasonLabels);

/** Quick waste modal: pick what was thrown away, how much, and why. Posts a negative stock movement. */
export default function WasteDialog({ open, onOpenChange, ingredientId }: Props) {
    const { data: options, isLoading } = useIngredientOptions(open);
    const form = useForm({ ingredient_id: '', quantity: '', unit_id: '', reason: 'spoilage', notes: '' });
    const errors = form.errors as Record<string, string>;

    useEffect(() => {
        if (open) {
            form.reset();
            form.clearErrors();
            form.setData('ingredient_id', ingredientId ? String(ingredientId) : '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, ingredientId]);

    const ingredient = options?.ingredients.find((i) => String(i.id) === form.data.ingredient_id);
    const units = unitsFor(options, form.data.ingredient_id);
    const unitId = form.data.unit_id || (ingredient ? String(ingredient.base_unit_id) : '');

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            ingredient_id: Number(data.ingredient_id),
            quantity: data.quantity,
            unit_id: unitId ? Number(unitId) : null,
            reason: data.reason,
            notes: data.notes.trim() || null,
        }));

        form.post(store.url(), { preserveScroll: true, onSuccess: () => onOpenChange(false) });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Log waste</DialogTitle>
                        <DialogDescription>Spoiled, spilled or thrown away. This lowers stock and is kept in the history.</DialogDescription>
                    </DialogHeader>

                    <Field id="waste-ingredient" label="Ingredient" error={errors.ingredient_id}>
                        <Select value={form.data.ingredient_id} onValueChange={(value) => form.setData({ ...form.data, ingredient_id: value, unit_id: '' })}>
                            <SelectTrigger id="waste-ingredient">
                                <SelectValue placeholder={isLoading ? 'Loading…' : 'Choose an ingredient'} />
                            </SelectTrigger>
                            <SelectContent>
                                {options?.ingredients.map((i) => (
                                    <SelectItem key={i.id} value={String(i.id)}>
                                        {i.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="waste-qty" label="Quantity" error={errors.quantity}>
                            <Input id="waste-qty" inputMode="decimal" value={form.data.quantity} onChange={(e) => form.setData('quantity', e.target.value)} />
                        </Field>
                        <Field id="waste-unit" label="Unit" error={errors.unit_id}>
                            <Select value={unitId} onValueChange={(value) => form.setData('unit_id', value)} disabled={!ingredient}>
                                <SelectTrigger id="waste-unit">
                                    <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent>
                                    {units.map((unit) => (
                                        <SelectItem key={unit.id} value={String(unit.id)}>
                                            {unit.name} ({unit.abbreviation})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>

                    <Field id="waste-reason" label="Reason" error={errors.reason}>
                        <Select value={form.data.reason} onValueChange={(value) => form.setData('reason', value)}>
                            <SelectTrigger id="waste-reason">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {REASONS.map((reason) => (
                                    <SelectItem key={reason} value={reason}>
                                        {wasteReasonLabels[reason]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field id="waste-notes" label="Note (optional)" error={errors.notes}>
                        <Input id="waste-notes" value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                    </Field>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing || !form.data.ingredient_id || form.data.quantity.trim() === ''}>
                            {form.processing ? 'Saving…' : 'Log waste'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
