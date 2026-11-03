import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';

import { Field, FormError } from '@/components/inventory/field';
import { IngredientSelect, UnitSelect } from '@/components/inventory/pickers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { unitsFor, useIngredientOptions } from '@/hooks/use-ingredient-options';
import { formatPeso, centsToPesos, pesosToCents } from '@/lib/money';
import { uuid } from '@/lib/uuid';
import { index, show, store, update } from '@/routes/inventory/purchase-orders';

/** `auto` rows were filled in from the supplier's price list; they are skipped on save while their quantity is blank. */
type Line = { uid: string; ingredient_id: string; unit_id: string; quantity: string; cost: string; auto?: boolean };

type Props = {
    /** The draft being edited; null when creating. */
    order: {
        id: number;
        supplier_id: number;
        expected_at: string | null;
        notes: string | null;
        items: { ingredient_id: number; unit_id: number; quantity_ordered: string; unit_cost_cents: number }[];
    } | null;
    suppliers: { id: number; name: string }[];
    /** Every supplier price: used to prefill the unit and cost when an ingredient is added. */
    prices: { supplier_id: number; ingredient_id: number; unit_id: number; unit_cost_cents: number; is_preferred: boolean }[];
};

const textareaClass =
    'border-input bg-background min-h-16 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

/** One blank-quantity row per ingredient the supplier sells, at the supplier's own unit and price. */
function linesFromPrices(prices: Props['prices'], supplierId: number | null, skip: Set<string> = new Set()): Line[] {
    if (!supplierId) {
        return [];
    }

    return prices
        .filter((p) => p.supplier_id === supplierId && !skip.has(String(p.ingredient_id)))
        .map((p) => ({
            uid: uuid(),
            ingredient_id: String(p.ingredient_id),
            unit_id: String(p.unit_id),
            quantity: '',
            cost: centsToPesos(p.unit_cost_cents),
            auto: true,
        }));
}

export default function PurchaseOrderForm({ order, suppliers, prices }: Props) {
    const { url } = usePage();
    const { data: options } = useIngredientOptions();

    // ?supplier=ID (from the supplier page) preselects the supplier on a new order.
    const presetSupplier = new URLSearchParams(url.split('?')[1] ?? '').get('supplier');

    const form = useForm<{ supplier_id: string; expected_at: string; notes: string; items: Line[] }>({
        supplier_id: order ? String(order.supplier_id) : (presetSupplier ?? ''),
        expected_at: order?.expected_at ? order.expected_at.slice(0, 10) : '',
        notes: order?.notes ?? '',
        items: order
            ? order.items.map((item) => ({
                  uid: uuid(),
                  ingredient_id: String(item.ingredient_id),
                  unit_id: String(item.unit_id),
                  quantity: String(Number(item.quantity_ordered)),
                  cost: centsToPesos(item.unit_cost_cents),
              }))
            : linesFromPrices(prices, Number(presetSupplier) || null),
    });
    const errors = form.errors as Record<string, string>;
    const supplierId = Number(form.data.supplier_id) || null;

    // Always change the CURRENT list (setData with a function), never a copy captured earlier in the render:
    // two quick changes (pick an ingredient, then its unit) must not overwrite each other or drop a row.
    const patch = (i: number, change: Partial<Line>) => form.setData((d) => ({ ...d, items: d.items.map((line, n) => (n === i ? { ...line, ...change } : line)) }));
    const addLine = () => form.setData((d) => ({ ...d, items: [...d.items, { uid: uuid(), ingredient_id: '', unit_id: '', quantity: '', cost: '' }] }));
    const removeLine = (i: number) => form.setData((d) => ({ ...d, items: d.items.filter((_, n) => n !== i) }));

    // Choosing a supplier lists everything they sell, with their unit and price. Rows the person already filled in
    // stay; untouched auto rows from a previously chosen supplier are replaced.
    function chooseSupplier(value: string) {
        const id = Number(value) || null;

        form.setData((d) => {
            const kept = d.items.filter((line) => !(line.auto && line.quantity.trim() === ''));

            return { ...d, supplier_id: value, items: [...kept, ...linesFromPrices(prices, id, new Set(kept.map((line) => line.ingredient_id)))] };
        });
    }

    function priceFor(ingredientId: number) {
        return prices.find((p) => p.supplier_id === supplierId && p.ingredient_id === ingredientId);
    }

    function pickIngredient(i: number, value: string) {
        const ingredient = options?.ingredients.find((x) => String(x.id) === value);
        const price = ingredient ? priceFor(ingredient.id) : undefined;

        patch(i, {
            ingredient_id: value,
            // The supplier's own unit and price when they have one; otherwise how you usually buy it.
            unit_id: price ? String(price.unit_id) : ingredient ? String(ingredient.purchase_unit_id ?? ingredient.base_unit_id) : '',
            cost: price ? centsToPesos(price.unit_cost_cents) : '',
        });
    }

    const total = form.data.items.reduce((sum, line) => sum + Math.round(Number(line.quantity || 0) * pesosToCents(line.cost || '0')), 0);

    function submit(event: FormEvent) {
        event.preventDefault();

        // Never drop a half-filled row silently (that is how items "disappeared"): say which row is unfinished.
        const problems: Record<string, string> = {};
        const isSkipped = (line: Line) => line.auto === true && line.quantity.trim() === '';
        const toSave = form.data.items.filter((line) => !isSkipped(line));

        if (toSave.length === 0) {
            (form.setError as (errors: Record<string, string>) => void)({ items: 'Enter a quantity for at least one item.' });

            return;
        }

        form.data.items.forEach((line, i) => {
            if (isSkipped(line)) {
                return;
            }

            if (!line.ingredient_id) {
                problems[`items.${i}.ingredient_id`] = `Item ${i + 1}: choose an ingredient, or remove the row.`;
            } else if (!line.unit_id) {
                problems[`items.${i}.unit_id`] = `Item ${i + 1}: choose a unit.`;
            } else if (line.quantity.trim() === '' || !(Number(line.quantity) > 0)) {
                problems[`items.${i}.quantity`] = `Item ${i + 1}: enter a quantity.`;
            }
        });

        if (Object.keys(problems).length > 0) {
            (form.setError as (errors: Record<string, string>) => void)(problems);

            return;
        }

        form.clearErrors();

        form.transform((data) => ({
            supplier_id: Number(data.supplier_id),
            expected_at: data.expected_at || null,
            notes: data.notes.trim() || null,
            items: data.items.filter((line) => !isSkipped(line)).map((line) => ({
                ingredient_id: Number(line.ingredient_id),
                unit_id: Number(line.unit_id),
                quantity: line.quantity,
                unit_cost_cents: pesosToCents(line.cost || '0'),
            })),
        }));

        if (order) {
            form.put(update.url(order.id));
        } else {
            form.post(store.url());
        }
    }

    return (
        <>
            <Head title={order ? 'Edit purchase order' : 'New purchase order'} />

            <form onSubmit={submit} className="max-w-4xl space-y-6 p-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">{order ? 'Edit purchase order' : 'New purchase order'}</h1>
                    <p className="text-muted-foreground text-sm">Saved as a draft. Nothing is ordered until you mark it as sent.</p>
                </div>

                <FormError message={errors.error} />

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="po-supplier" label="Supplier" error={errors.supplier_id}>
                        <Select value={form.data.supplier_id} onValueChange={chooseSupplier}>
                            <SelectTrigger id="po-supplier">
                                <SelectValue placeholder="Choose a supplier" />
                            </SelectTrigger>
                            <SelectContent>
                                {suppliers.map((supplier) => (
                                    <SelectItem key={supplier.id} value={String(supplier.id)}>
                                        {supplier.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field id="po-expected" label="Expected on (optional)" error={errors.expected_at}>
                        <Input id="po-expected" type="date" value={form.data.expected_at} onChange={(e) => form.setData('expected_at', e.target.value)} />
                    </Field>
                </div>

                <section className="space-y-3">
                    <h2 className="font-semibold">Items</h2>

                    {form.data.items.length === 0 && (
                        <p className="text-muted-foreground text-sm">{supplierId ? 'This supplier has no prices set yet. Add items below.' : 'Choose a supplier to list what they sell.'}</p>
                    )}
                    {form.data.items.some((line) => line.auto) && (
                        <p className="text-muted-foreground text-sm">Enter a quantity for what you want to order. Rows left empty are not included.</p>
                    )}

                    <div className="space-y-2">
                        {form.data.items.map((line, i) => {
                            const lineTotal = Math.round(Number(line.quantity || 0) * pesosToCents(line.cost || '0'));
                            const error = errors[`items.${i}.ingredient_id`] ?? errors[`items.${i}.unit_id`] ?? errors[`items.${i}.quantity`] ?? errors[`items.${i}.unit_cost_cents`];

                            return (
                                <div key={line.uid} className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                                        <IngredientSelect value={line.ingredient_id} onChange={(value) => pickIngredient(i, value)} ingredients={options?.ingredients ?? []} label="Ingredient" />
                                        <Input className="w-24" inputMode="decimal" placeholder="Qty" aria-label="Quantity" value={line.quantity} onChange={(e) => patch(i, { quantity: e.target.value })} />
                                        <UnitSelect value={line.unit_id} onChange={(value) => patch(i, { unit_id: value })} units={unitsFor(options, line.ingredient_id)} />
                                        <Input className="w-28" inputMode="decimal" placeholder="₱ per unit" aria-label="Cost per unit" value={line.cost} onChange={(e) => patch(i, { cost: e.target.value })} />
                                        <span className="text-muted-foreground ml-auto w-28 text-right text-sm tabular-nums">{formatPeso(lineTotal)}</span>
                                        <Button type="button" size="icon" variant="ghost" aria-label="Remove item" onClick={() => removeLine(i)}>
                                            <Trash2 className="text-destructive size-4" />
                                        </Button>
                                    </div>
                                    {error && <p className="text-destructive text-sm">{error}</p>}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Button type="button" variant="outline" onClick={addLine}>
                            <Plus className="size-4" /> Add item
                        </Button>
                        <p className="font-semibold tabular-nums">Total {formatPeso(total)}</p>
                    </div>
                    {errors.items && <p className="text-destructive text-sm">{errors.items}</p>}
                </section>

                <Field id="po-notes" label="Notes (optional)" error={errors.notes}>
                    <textarea id="po-notes" className={textareaClass} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                </Field>

                <div className="flex gap-2">
                    <Button type="submit" disabled={form.processing || !form.data.supplier_id || form.data.items.length === 0}>
                        {form.processing ? 'Saving…' : 'Save draft'}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href={order ? show.url(order.id) : index.url()}>Cancel</Link>
                    </Button>
                </div>
            </form>
        </>
    );
}

PurchaseOrderForm.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: '/inventory/ingredients' },
        { title: 'Purchase orders', href: index() },
        { title: 'Purchase order', href: index() },
    ],
};