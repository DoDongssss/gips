import { Head, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { DataTable } from '@/components/shared/data-table';
import { Pager } from '@/components/shared/pager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cleanQuery } from '@/lib/inventory';
import { columnClassNames, getColumns } from '@/pages/inventory/suppliers/columns';
import SupplierDialog from '@/pages/inventory/suppliers/supplier-dialog';
import { index } from '@/routes/inventory/suppliers';
import type { Supplier } from '@/types/inventory';
import type { Paginated } from '@/types/menu';

type Filters = {
    search: string;
    filter: string;
    sort?: string | null;
    direction?: 'asc' | 'desc' | null;
};

type Props = {
    // Optional on the server: undefined until the person asks for it.
    suppliers?: Paginated<Supplier>;
    filters: Filters;
};

const ONLY = ['suppliers', 'filters'];

export default function SuppliersIndex({ suppliers, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [loading, setLoading] = useState(false);
    const [dialog, setDialog] = useState<{ open: boolean; supplier?: Supplier }>({ open: false });

    const [loaded, setLoaded] = useState<Paginated<Supplier> | undefined>(suppliers);
    const data = suppliers ?? loaded;

    const columns = useMemo(
        () =>
            getColumns({
                onEdit: (supplier) => setDialog({ open: true, supplier }),
            }),
        [],
    );

    const sorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction === 'desc' }] : []),
        [filters.sort, filters.direction],
    );

    function visit(next: Partial<Filters> = {}) {
        const merged = { ...filters, ...next };

        router.get(
            index.url(),
            cleanQuery({
                search: merged.search,
                filter: merged.filter,
                sort: merged.sort,
                direction: merged.direction,
            }),
            {
                only: ONLY,
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    }

    function loadSuppliers() {
        router.reload({
            only: ONLY,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    useEffect(() => {
        if (suppliers) {
            setLoaded(suppliers);
        } else if (loaded) {
            loadSuppliers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [suppliers]);

    function submitSearch(event: FormEvent) {
        event.preventDefault();
        visit({ search });
    }

    function handleSortingChange(next: SortingState) {
        const [first] = next;

        visit({
            sort: first?.id ?? null,
            direction: first ? (first.desc ? 'desc' : 'asc') : null,
        });
    }

    return (
        <>
            <Head title="Suppliers" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Suppliers</h1>
                        {data && <p className="text-muted-foreground text-sm">{data.total} total</p>}
                    </div>
                    <Button onClick={() => setDialog({ open: true })}>Add supplier</Button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <form onSubmit={submitSearch} className="flex min-w-64 max-w-sm flex-1 gap-2">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, contact, phone, or email" aria-label="Search suppliers" />
                        <Button type="submit" variant="outline" disabled={loading}>
                            Search
                        </Button>
                    </form>

                    <Select value={filters.filter || 'active'} onValueChange={(value) => visit({ filter: value })}>
                        <SelectTrigger className="w-44" aria-label="Status filter">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Active only</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <DataTable
                    columns={columns}
                    data={data?.data ?? []}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    columnClassNames={columnClassNames}
                    emptyContent={
                        data ? (
                            'No suppliers found.'
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm">Suppliers aren&apos;t loaded yet.</p>
                                <Button onClick={loadSuppliers} disabled={loading}>
                                    {loading ? 'Loading…' : 'Load suppliers'}
                                </Button>
                            </div>
                        )
                    }
                />

                {data && <Pager currentPage={data.current_page} lastPage={data.last_page} prevUrl={data.prev_page_url} nextUrl={data.next_page_url} only={ONLY} />}
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
