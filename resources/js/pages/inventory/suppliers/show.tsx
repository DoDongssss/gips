import { Head, Link, router } from '@inertiajs/react';
import { Star, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPeso } from '@/lib/money';
import PriceDialog from '@/pages/inventory/suppliers/price-dialog';
import SupplierDialog from '@/pages/inventory/suppliers/supplier-dialog';
import { create } from '@/routes/inventory/purchase-orders';
import { index } from '@/routes/inventory/suppliers';
import { destroy } from '@/routes/inventory/suppliers/prices';
import type { Supplier, SupplierPrice } from '@/types/inventory';

type Props = { supplier: Supplier; prices: SupplierPrice[] };

export default function SupplierShow({ supplier, prices }: Props) {
    const [editing, setEditing] = useState(false);
    const [priceDialog, setPriceDialog] = useState<{ open: boolean; price?: SupplierPrice }>({ open: false });

    function removePrice(price: SupplierPrice) {
        if (confirm(`Remove the price for ${price.ingredient}?`)) {
            router.delete(destroy.url({ supplier: supplier.id, price: price.id }), { preserveScroll: true });
        }
    }

    return (
        <>
            <Head title={supplier.name} />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight">{supplier.name}</h1>
                            {!supplier.is_active && <Badge variant="secondary">Inactive</Badge>}
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {[supplier.contact_person, supplier.phone, supplier.email].filter(Boolean).join(' · ') || 'No contact details'}
                        </p>
                        {supplier.address && <p className="text-muted-foreground text-sm">{supplier.address}</p>}
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setEditing(true)}>
                            Edit supplier
                        </Button>
                        <Button asChild>
                            <Link href={create.url({ query: { supplier: supplier.id } })}>New purchase order</Link>
                        </Button>
                    </div>
                </div>

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold">Price list</h2>
                        <Button variant="outline" onClick={() => setPriceDialog({ open: true })}>
                            Add price
                        </Button>
                    </div>

                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="text-muted-foreground border-b text-left">
                                <tr>
                                    <th className="p-3 font-medium">Ingredient</th>
                                    <th className="p-3 font-medium">SKU</th>
                                    <th className="p-3 text-right font-medium">Price</th>
                                    <th className="p-3 font-medium" />
                                    <th className="w-36 p-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {prices.map((price) => (
                                    <tr key={price.id} className="border-b last:border-0">
                                        <td className="p-3 font-medium">{price.ingredient}</td>
                                        <td className="text-muted-foreground p-3">{price.supplier_sku ?? '—'}</td>
                                        <td className="p-3 text-right tabular-nums">
                                            {formatPeso(price.unit_cost_cents)} / {price.unit}
                                        </td>
                                        <td className="p-3">
                                            {price.is_preferred && (
                                                <Badge variant="outline" className="gap-1">
                                                    <Star className="size-3" /> Preferred
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setPriceDialog({ open: true, price })}>
                                                    Edit
                                                </Button>
                                                <Button variant="ghost" size="icon" aria-label={`Remove ${price.ingredient}`} onClick={() => removePrice(price)}>
                                                    <Trash2 className="text-destructive size-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {prices.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-muted-foreground p-8 text-center">
                                            No prices yet. Add what this supplier charges so purchase orders fill in costs for you.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <SupplierDialog open={editing} onOpenChange={setEditing} supplier={supplier} onDeleted={() => router.visit(index.url())} />
            <PriceDialog open={priceDialog.open} supplierId={supplier.id} price={priceDialog.price} onOpenChange={(open) => setPriceDialog((current) => ({ ...current, open }))} />
        </>
    );
}

SupplierShow.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: '/inventory/ingredients' },
        { title: 'Suppliers', href: index() },
        { title: 'Supplier', href: index() },
    ],
};
