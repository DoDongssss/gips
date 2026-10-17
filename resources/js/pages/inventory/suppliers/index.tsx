import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Pager } from '@/components/inventory/pager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cleanQuery } from '@/lib/inventory';
import SupplierDialog from '@/pages/inventory/suppliers/supplier-dialog';
import { index, show } from '@/routes/inventory/suppliers';
import type { Paginated } from '@/types/menu';
import type { Supplier } from '@/types/inventory';

type Props = { suppliers: Paginated<Supplier>; filters: { search: string } };

export default function SuppliersIndex({ suppliers, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [dialog, setDialog] = useState<{ open: boolean; supplier?: Supplier }>({ open: false });

    function submit(event: FormEvent) {
        event.preventDefault();
        router.get(index.url(), cleanQuery({ search }), { preserveState: true, replace: true });
    }

    return (
        <>
            <Head title="Suppliers" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Suppliers</h1>
                        <p className="text-muted-foreground text-sm">{suppliers.total} total</p>
                    </div>
                    <Button onClick={() => setDialog({ open: true })}>Add supplier</Button>
                </div>

                <form onSubmit={submit} className="flex max-w-sm gap-2">
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers" aria-label="Search suppliers" />
                    <Button type="submit" variant="outline">
                        Search
                    </Button>
                </form>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="text-muted-foreground border-b text-left">
                            <tr>
                                <th className="p-3 font-medium">Supplier</th>
                                <th className="p-3 font-medium">Contact</th>
                                <th className="p-3 font-medium">Phone</th>
                                <th className="p-3 text-right font-medium">Ingredients</th>
                                <th className="p-3 font-medium">Status</th>
                                <th className="w-44 p-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.data.map((supplier) => (
                                <tr key={supplier.id} className="border-b last:border-0">
                                    <td className="p-3 font-medium">{supplier.name}</td>
                                    <td className="text-muted-foreground p-3">{supplier.contact_person ?? '—'}</td>
                                    <td className="text-muted-foreground p-3">{supplier.phone ?? '—'}</td>
                                    <td className="p-3 text-right tabular-nums">{supplier.ingredients_count ?? 0}</td>
                                    <td className="p-3">
                                        <Badge variant={supplier.is_active ? 'default' : 'secondary'}>{supplier.is_active ? 'Active' : 'Inactive'}</Badge>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setDialog({ open: true, supplier })}>
                                                Edit
                                            </Button>
                                            <Button size="sm" asChild>
                                                <Link href={show.url(supplier.id)}>Prices</Link>
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {suppliers.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-muted-foreground p-8 text-center">
                                        No suppliers yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pager currentPage={suppliers.current_page} lastPage={suppliers.last_page} prevUrl={suppliers.prev_page_url} nextUrl={suppliers.next_page_url} />
            </div>

            <SupplierDialog open={dialog.open} supplier={dialog.supplier} onOpenChange={(open) => setDialog((current) => ({ ...current, open }))} />
        </>
    );
}

SuppliersIndex.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: '/inventory/ingredients' },
        { title: 'Suppliers', href: index() },
    ],
};
