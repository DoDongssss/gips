import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Field } from '@/components/inventory/field';
import { IngredientSelect, UnitSelect } from '@/components/inventory/pickers';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { unitsFor, useIngredientOptions } from '@/hooks/use-ingredient-options';
import { centsToPesos, pesosToCents } from '@/lib/money';
import { save } from '@/routes/inventory/suppliers/prices';
import type { SupplierPrice } from '@/types/inventory';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; supplierId: number; price?: SupplierPrice };

/** One line of a supplier's price list: what they charge for an ingredient, per unit they sell it in. */
export default function PriceDialog({ open, onOpenChange, supplierId, price }: Props) {
    const { data: options } = useIngredientOptions(open);
    const form = useForm({ ingredient_id: '', unit_id: '', supplier_sku: '', price: '', is_preferred: false });
    const errors = form.errors as Record<string, string>;

    useEffect(() => {
        if (open) {
            form.setData({
                ingredient_id: price ? String(price.ingredient_id) : '',
                unit_id: price ? String(price.unit_id) : '',
                supplier_sku: price?.supplier_sku ?? '',
                price: price ? centsToPesos(price.unit_cost_cents) : '',
                is_preferred: price?.is_preferred ?? false,
            });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, price?.id]);

    function pickIngredient(value: string) {
        const ingredient = options?.ingredients.find((i) => String(i.id) === value);

        form.setData({ ...form.data, ingredient_id: value, unit_id: ingredient ? String(ingredient.purchase_unit_id ?? ingredient.base_unit_id) : '' });
    }

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            ingredient_id: Number(data.ingredient_id),
            unit_id: Number(data.unit_id),
            supplier_sku: data.supplier_sku.trim() || null,
            unit_cost_cents: pesosToCents(data.price),
            is_preferred: data.is_preferred,
        }));

        form.post(save.url(supplierId), { preserveScroll: true, onSuccess: () => onOpenChange(false) });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{price ? 'Edit price' : 'Add a price'}</DialogTitle>
                        <DialogDescription>Used to prefill purchase orders. Saving an ingredient that is already listed updates its price.</DialogDescription>
                    </DialogHeader>

                    <Field id="price-ingredient" label="Ingredient" error={errors.ingredient_id}>
                        <IngredientSelect value={form.data.ingredient_id} onChange={pickIngredient} ingredients={options?.ingredients ?? []} label="Ingredient" className="w-full" disabled={Boolean(price)} />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="price-unit" label="Sold per" error={errors.unit_id}>
                            <UnitSelect value={form.data.unit_id} onChange={(value) => form.setData('unit_id', value)} units={unitsFor(options, form.data.ingredient_id)} label="Sold per" className="w-full" />
                        </Field>
                        <Field id="price-cost" label="Price (₱) per unit" error={errors.unit_cost_cents}>
                            <Input id="price-cost" inputMode="decimal" placeholder="0.00" value={form.data.price} onChange={(e) => form.setData('price', e.target.value)} />
                        </Field>
                    </div>

                    <Field id="price-sku" label="Supplier SKU (optional)" error={errors.supplier_sku}>
                        <Input id="price-sku" value={form.data.supplier_sku} onChange={(e) => form.setData('supplier_sku', e.target.value)} />
                    </Field>

                    <label className="flex items-center gap-2 text-sm">
                        <Switch checked={form.data.is_preferred} onCheckedChange={(value) => form.setData('is_preferred', value)} />
                        Preferred supplier for this ingredient
                    </label>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing || !form.data.ingredient_id || !form.data.unit_id}>
                            {form.processing ? 'Saving…' : 'Save price'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
