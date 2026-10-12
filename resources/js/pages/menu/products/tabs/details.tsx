import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { centsToPesos, pesosToCents } from '@/lib/money';
import { FieldError } from '@/components/fieldError';
import { update } from '@/routes/menu/products';
import type { Option, ProductDetail } from '@/types/menu';

type Props = { product: ProductDetail; categories: Option[] };

export function DetailsTab({ product, categories }: Props) {
    const form = useForm({
        name: product.name,
        category_id: String(product.category_id),
        sku: product.sku ?? '',
        description: product.description ?? '',
        price: centsToPesos(product.base_price_cents),
        prep_minutes: product.prep_time_seconds ? String(Math.round(product.prep_time_seconds / 60)) : '',
        is_taxable: product.is_taxable,
        is_active: product.is_active,
    });

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            name: data.name,
            category_id: data.category_id,
            sku: data.sku || null,
            description: data.description || null,
            base_price_cents: pesosToCents(data.price),
            prep_time_seconds: data.prep_minutes ? Number(data.prep_minutes) * 60 : null,
            is_taxable: data.is_taxable,
            is_active: data.is_active,
        }));

        form.put(update.url(product.id), { preserveScroll: true });
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="product-edit-name">Name</Label>
                <Input id="product-edit-name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                <FieldError message={form.errors.name} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.data.category_id} onValueChange={(value) => form.setData('category_id', value)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((category) => (
                                <SelectItem key={category.id} value={String(category.id)}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FieldError message={form.errors.category_id} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="product-edit-sku">SKU (optional)</Label>
                    <Input id="product-edit-sku" value={form.data.sku} onChange={(event) => form.setData('sku', event.target.value)} />
                    <FieldError message={form.errors.sku} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="product-edit-price">Base price (₱)</Label>
                    <Input
                        id="product-edit-price"
                        inputMode="decimal"
                        value={form.data.price}
                        onChange={(event) => form.setData('price', event.target.value)}
                    />
                    <p className="text-muted-foreground text-xs">Used when the product has no sizes. Sizes carry their own full price.</p>
                    <FieldError message={(form.errors as Record<string, string>).base_price_cents} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="product-edit-prep">Prep time (minutes, optional)</Label>
                    <Input
                        id="product-edit-prep"
                        inputMode="numeric"
                        value={form.data.prep_minutes}
                        onChange={(event) => form.setData('prep_minutes', event.target.value)}
                    />
                    <FieldError message={(form.errors as Record<string, string>).prep_time_seconds} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="product-edit-description">Description (optional)</Label>
                <Textarea
                    id="product-edit-description"
                    rows={3}
                    value={form.data.description}
                    onChange={(event) => form.setData('description', event.target.value)}
                />
            </div>

            <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                    <Switch checked={form.data.is_taxable} onCheckedChange={(value) => form.setData('is_taxable', value)} />
                    Taxable
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <Switch checked={form.data.is_active} onCheckedChange={(value) => form.setData('is_active', value)} />
                    Show on POS and kiosk
                </label>
            </div>

            <Button type="submit" disabled={form.processing}>
                Save details
            </Button>
        </form>
    );
}