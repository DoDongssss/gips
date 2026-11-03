import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Field } from '@/components/inventory/field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { destroy, store, update } from '@/routes/inventory/ingredients';
import type { IngredientCategory, IngredientRow, Unit } from '@/types/inventory';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ingredient?: IngredientRow;
    categories: IngredientCategory[];
    units: Unit[];
};

type FormData = {
    name: string;
    sku: string;
    ingredient_category_id: string;
    base_unit_id: string;
    purchase_unit_id: string;
    reorder_level: string;
    is_active: boolean;
};

const NONE = 'none';

const initial = (ingredient?: IngredientRow): FormData => ({
    name: ingredient?.name ?? '',
    sku: ingredient?.sku ?? '',
    ingredient_category_id: ingredient?.ingredient_category_id ? String(ingredient.ingredient_category_id) : NONE,
    base_unit_id: ingredient ? String(ingredient.base_unit_id) : '',
    purchase_unit_id: ingredient?.purchase_unit_id ? String(ingredient.purchase_unit_id) : NONE,
    reorder_level: ingredient ? String(Number(ingredient.reorder_level)) : '0',
    is_active: ingredient?.is_active ?? true,
});

export default function IngredientFormDialog({ open, onOpenChange, ingredient, categories, units }: Props) {
    const form = useForm<FormData>(initial());
    const errors = form.errors as Record<string, string>;
    const baseUnit = units.find((u) => String(u.id) === form.data.base_unit_id);

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData(initial(ingredient));
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, ingredient?.id]);

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            name: data.name,
            sku: data.sku.trim() || null,
            ingredient_category_id: data.ingredient_category_id === NONE ? null : Number(data.ingredient_category_id),
            base_unit_id: Number(data.base_unit_id),
            purchase_unit_id: data.purchase_unit_id === NONE ? null : Number(data.purchase_unit_id),
            reorder_level: data.reorder_level.trim() === '' ? 0 : data.reorder_level,
            is_active: data.is_active,
        }));

        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };

        if (ingredient) {
            form.put(update.url(ingredient.id), options);
        } else {
            form.post(store.url(), options);
        }
    }

    function remove() {
        if (ingredient && confirm(`Delete "${ingredient.name}"? An ingredient used in a recipe cannot be deleted; mark it inactive instead.`)) {
            form.delete(destroy.url(ingredient.id), { preserveScroll: true, onSuccess: () => onOpenChange(false) });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{ingredient ? 'Edit ingredient' : 'New ingredient'}</DialogTitle>
                        <DialogDescription>Stock is counted and deducted in the base unit.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="ing-name" label="Name" error={errors.name}>
                            <Input id="ing-name" autoFocus placeholder="e.g. Espresso beans" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                        </Field>
                        <Field id="ing-sku" label="SKU (optional)" error={errors.sku}>
                            <Input id="ing-sku" value={form.data.sku} onChange={(e) => form.setData('sku', e.target.value)} />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="ing-category" label="Category" error={errors.ingredient_category_id}>
                            <Select value={form.data.ingredient_category_id} onValueChange={(value) => form.setData('ingredient_category_id', value)}>
                                <SelectTrigger id="ing-category">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NONE}>No category</SelectItem>
                                    {categories.map((category) => (
                                        <SelectItem key={category.id} value={String(category.id)}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field id="ing-reorder" label={`Reorder level${baseUnit ? ` (${baseUnit.abbreviation})` : ''}`} error={errors.reorder_level} hint="You get an alert when stock falls to this.">
                            <Input id="ing-reorder" inputMode="decimal" value={form.data.reorder_level} onChange={(e) => form.setData('reorder_level', e.target.value)} />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            id="ing-base"
                            label="Base unit"
                            error={errors.base_unit_id}
                            hint={ingredient ? 'Cannot change once the ingredient has stock history.' : 'Smallest unit you use, like g or ml.'}
                        >
                            <Select value={form.data.base_unit_id} onValueChange={(value) => form.setData('base_unit_id', value)}>
                                <SelectTrigger id="ing-base">
                                    <SelectValue placeholder="Choose a unit" />
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
                        <Field id="ing-purchase" label="Usually bought in" error={errors.purchase_unit_id} hint="Used to prefill purchase orders.">
                            <Select value={form.data.purchase_unit_id} onValueChange={(value) => form.setData('purchase_unit_id', value)}>
                                <SelectTrigger id="ing-purchase">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NONE}>Same as base unit</SelectItem>
                                    {units.map((unit) => (
                                        <SelectItem key={unit.id} value={String(unit.id)}>
                                            {unit.name} ({unit.abbreviation})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <Switch checked={form.data.is_active} onCheckedChange={(value) => form.setData('is_active', value)} />
                        Active
                    </label>

                    {errors.error && <p className="text-destructive text-sm">{errors.error}</p>}

                    <DialogFooter className="sm:justify-between">
                        {ingredient ? (
                            <Button type="button" variant="ghost" className="text-destructive" onClick={remove}>
                                Delete
                            </Button>
                        ) : (
                            <span />
                        )}
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Saving…' : 'Save ingredient'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
