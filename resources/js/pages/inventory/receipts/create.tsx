import { Head, Link, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';

import { Field, FormError } from '@/components/inventory/field';
import { IngredientSelect, UnitSelect } from '@/components/inventory/pickers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { unitsFor, useIngredientOptions } from '@/hooks/use-ingredient-options';
import { formatQty } from '@/lib/inventory';
import { centsToPesos, formatPeso, pesosToCents } from '@/lib/money';
import { index, store } from '@/routes/inventory/receipts';

type Line = {
    purchase_order_item_id: number | null;
    ingredient_id: string;
    ingredient_name: string;
    unit_id: string;
    quantity: string;
    cost: string;
    batch_no: string;
    expires_on: string;
    /** Outstanding on the PO, shown as a hint. */
    outstanding: string | null;
};

type Props = {
    order: {
        id: number;
        po_number: string;
        supplier_id: number;
        items: {
            purchase_order_item_id: number;
            ingredient_id: number;
            ingredient: string;
            unit_id: number;
            unit: string;
            quantity_outstanding: string;
            unit_cost_cents: number;
        }[];
    } | null;
    suppliers: { id: number; name: string }[];
};

const textareaClass =
    'border-input bg-background min-h-16 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

/**
 * The receive screen. From a purchase order, lines start with what is still outstanding:
 * change the amount to what actually arrived, or remove a line that did not come.
 */
export default function ReceiptCreate({ order, suppliers }: Props) {
    const { data: options } = useIngredientOptions();

    const form = useForm<{ supplier_id: string; invoice_no: string; notes: string; lines: Line[] }>({
        supplier_id: order ? String(order.supplier_id) : '',
        invoice_no: '',
        notes: '',
        lines: order
            ? order.items.map((item) => ({
                  purchase_order_item_id: item.purchase_order_item_id,
                  ingredient_id: String(item.ingredient_id),
                  ingredient_name: item.ingredient,
                  unit_id: String(item.unit_id),
                  quantity: String(Number(item.quantity_outstanding)),
                  cost: centsToPesos(item.unit_cost_cents),
                  batch_no: '',
                  expires_on: '',
                  outstanding: item.quantity_outstanding,
              }))
            : [],
    });
    const errors = form.errors as Record<string, string>;

    const patch = (i: number, change: Partial<Line>) => form.setData('lines', form.data.lines.map((line, n) => (n === i ? { ...line, ...change } : line)));

    function pickIngredient(i: number, value: string) {
        const ingredient = options?.ingredients.find((x) => String(x.id) === value);

        patch(i, { ingredient_id: value, ingredient_name: ingredient?.name ?? '', unit_id: ingredient ? String(ingredient.purchase_unit_id ?? ingredient.base_unit_id) : '' });
    }

    const total = form.data.lines.reduce((sum, line) => sum + Math.round(Number(line.quantity || 0) * pesosToCents(line.cost || '0')), 0);
    const filled = form.data.lines.filter((line) => line.ingredient_id && line.unit_id && Number(line.quantity) > 0);

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            supplier_id: Number(data.supplier_id),
            purchase_order_id: order?.id ?? null,
            invoice_no: data.invoice_no.trim() || null,
            notes: data.notes.trim() || null,
            items: data.lines
                .filter((line) => line.ingredient_id && line.unit_id && Number(line.quantity) > 0)
                .map((line) => ({
                    purchase_order_item_id: line.purchase_order_item_id,
                    ingredient_id: Number(line.ingredient_id),
                    unit_id: Number(line.unit_id),
                    quantity: line.quantity,
                    unit_cost_cents: pesosToCents(line.cost || '0'),
                    batch_no: line.batch_no.trim() || null,
                    expires_on: line.expires_on || null,
                })),
        }));

        form.post(store.url());
    }

    return (
        <>
            <Head title="Receive goods" />

            <form onSubmit={submit} className="max-w-5xl space-y-6 p-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Receive goods{order && ` · ${order.po_number}`}</h1>
                    <p className="text-muted-foreground text-sm">
                        Stock goes up by what you enter and each ingredient&apos;s average cost is updated from the price paid. This cannot be undone; fix mistakes with an adjustment.
                    </p>
                </div>

                <FormError message={errors.error} />

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="gr-supplier" label="Supplier" error={errors.supplier_id}>
                        <Select value={form.data.supplier_id} onValueChange={(value) => form.setData('supplier_id', value)} disabled={Boolean(order)}>
                            <SelectTrigger id="gr-supplier">
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
                    <Field id="gr-invoice" label="Supplier invoice no. (optional)" error={errors.invoice_no}>
                        <Input id="gr-invoice" value={form.data.invoice_no} onChange={(e) => form.setData('invoice_no', e.target.value)} />
                    </Field>
                </div>

                <section className="space-y-3">
                    <h2 className="font-semibold">What arrived</h2>

                    {form.data.lines.length === 0 && <p className="text-muted-foreground text-sm">Add the ingredients that were delivered.</p>}

                    <div className="space-y-2">
                        {form.data.lines.map((line, i) => {
                            const error =
                                errors[`items.${i}.quantity`] ?? errors[`items.${i}.unit_id`] ?? errors[`items.${i}.unit_cost_cents`] ?? errors[`items.${i}.ingredient_id`] ?? errors[`items.${i}.expires_on`];

                            return (
                                <div key={i} className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                                        {line.purchase_order_item_id ? (
                                            <span className="w-52 px-1 font-medium">{line.ingredient_name}</span>
                                        ) : (
                                            <IngredientSelect value={line.ingredient_id} onChange={(value) => pickIngredient(i, value)} ingredients={options?.ingredients ?? []} label="Ingredient" />
                                        )}
                                        <Input className="w-24" inputMode="decimal" placeholder="Qty" aria-label="Quantity received" value={line.quantity} onChange={(e) => patch(i, { quantity: e.target.value })} />
                                        {line.purchase_order_item_id ? (
                                            <span className="text-muted-foreground w-16 text-sm">{options?.units.find((u) => String(u.id) === line.unit_id)?.abbreviation}</span>
                                        ) : (
                                            <UnitSelect value={line.unit_id} onChange={(value) => patch(i, { unit_id: value })} units={unitsFor(options, line.ingredient_id)} />
                                        )}
                                        <Input className="w-28" inputMode="decimal" placeholder="₱ per unit" aria-label="Cost per unit" value={line.cost} onChange={(e) => patch(i, { cost: e.target.value })} />
                                        <Input className="w-28" placeholder="Batch (opt.)" aria-label="Batch number" value={line.batch_no} onChange={(e) => patch(i, { batch_no: e.target.value })} />
                                        <Input className="w-36" type="date" aria-label="Expires on" value={line.expires_on} onChange={(e) => patch(i, { expires_on: e.target.value })} />
                                        <Button type="button" size="icon" variant="ghost" className="ml-auto" aria-label="Remove line" onClick={() => form.setData('lines', form.data.lines.filter((_, n) => n !== i))}>
                                            <Trash2 className="text-destructive size-4" />
                                        </Button>
                                    </div>
                                    {line.outstanding !== null && <p className="text-muted-foreground px-1 text-xs">Outstanding on the order: {formatQty(line.outstanding)}</p>}
                                    {error && <p className="text-destructive text-sm">{error}</p>}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {!order ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    form.setData('lines', [
                                        ...form.data.lines,
                                        { purchase_order_item_id: null, ingredient_id: '', ingredient_name: '', unit_id: '', quantity: '', cost: '', batch_no: '', expires_on: '', outstanding: null },
                                    ])
                                }
                            >
                                <Plus className="size-4" /> Add line
                            </Button>
                        ) : (
                            <span />
                        )}
                        <p className="font-semibold tabular-nums">Value received {formatPeso(total)}</p>
                    </div>
                    {errors.items && <p className="text-destructive text-sm">{errors.items}</p>}
                </section>

                <Field id="gr-notes" label="Notes (optional)" error={errors.notes}>
                    <textarea id="gr-notes" className={textareaClass} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                </Field>

                <div className="flex gap-2">
                    <Button type="submit" disabled={form.processing || !form.data.supplier_id || filled.length === 0}>
                        {form.processing ? 'Receiving…' : 'Receive and add to stock'}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href={index.url()}>Cancel</Link>
                    </Button>
                </div>
            </form>
        </>
    );
}

ReceiptCreate.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: '/inventory/ingredients' },
        { title: 'Receiving', href: index() },
        { title: 'Receive', href: index() },
    ],
};
