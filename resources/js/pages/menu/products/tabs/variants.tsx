import { useForm } from '@inertiajs/react';
import { Plus, Star, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { centsToPesos, formatPeso, pesosToCents } from '@/lib/money';
import { FieldError } from '@/components/fieldError';
import { sync as syncVariants } from '@/routes/menu/products/variants';
import type { ProductDetail } from '@/types/menu';

type VariantRow = { id?: number; name: string; price: string; is_default: boolean; is_active: boolean };

export function VariantsTab({ product }: { product: ProductDetail }) {
    const form = useForm<{ variants: VariantRow[] }>({
        variants: product.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            price: centsToPesos(variant.price_cents),
            is_default: variant.is_default,
            is_active: variant.is_active,
        })),
    });
    const errors = form.errors as Record<string, string>;

    const set = (rows: VariantRow[]) => form.setData('variants', rows);
    const patch = (index: number, change: Partial<VariantRow>) =>
        set(form.data.variants.map((row, i) => (i === index ? { ...row, ...change } : row)));
    const makeDefault = (index: number) => set(form.data.variants.map((row, i) => ({ ...row, is_default: i === index })));

    function add(name = '') {
        set([...form.data.variants, { name, price: '', is_default: form.data.variants.length === 0, is_active: true }]);
    }

    function remove(index: number) {
        const rest = form.data.variants.filter((_, i) => i !== index);

        set(rest.length && !rest.some((row) => row.is_default) ? rest.map((row, i) => ({ ...row, is_default: i === 0 })) : rest);
    }

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            variants: data.variants.map((row) => ({
                id: row.id ?? null,
                name: row.name,
                price_cents: pesosToCents(row.price),
                is_default: row.is_default,
                is_active: row.is_active,
            })),
        }));

        form.put(syncVariants.url(product.id), { preserveScroll: true });
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <p className="text-muted-foreground text-sm">
                Add sizes only if the price changes with size. Enter the <strong>full price</strong> of each size, not the difference.
            </p>

            {form.data.variants.length === 0 && (
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 rounded-md border border-dashed p-4 text-sm">
                    No sizes. This product sells at {formatPeso(product.base_price_cents)}.
                    <span className="flex gap-2">
                        {['Small', 'Medium', 'Large'].map((name) => (
                            <Button key={name} type="button" size="sm" variant="outline" onClick={() => add(name)}>
                                + {name}
                            </Button>
                        ))}
                    </span>
                </div>
            )}

            <div className="space-y-2">
                {form.data.variants.map((row, index) => (
                    <div key={row.id ?? `new-${index}`} className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                            <Input
                                className="w-36"
                                placeholder="Name"
                                aria-label="Size name"
                                value={row.name}
                                onChange={(event) => patch(index, { name: event.target.value })}
                            />
                            <Input
                                className="w-28"
                                inputMode="decimal"
                                placeholder="₱ price"
                                aria-label="Size price"
                                value={row.price}
                                onChange={(event) => patch(index, { price: event.target.value })}
                            />
                            <Button type="button" size="sm" variant={row.is_default ? 'default' : 'outline'} onClick={() => makeDefault(index)}>
                                <Star className="size-3.5" /> {row.is_default ? 'Default' : 'Make default'}
                            </Button>
                            <label className="flex items-center gap-2 text-sm">
                                <Switch checked={row.is_active} onCheckedChange={(value) => patch(index, { is_active: value })} />
                                Active
                            </label>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="ml-auto"
                                aria-label="Remove size"
                                onClick={() => remove(index)}
                            >
                                <Trash2 className="text-destructive size-4" />
                            </Button>
                        </div>
                        <FieldError message={errors[`variants.${index}.name`] ?? errors[`variants.${index}.price_cents`]} />
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => add()}>
                    <Plus className="size-4" /> Add size
                </Button>
                <Button type="submit" disabled={form.processing}>
                    Save sizes
                </Button>
            </div>
        </form>
    );
}