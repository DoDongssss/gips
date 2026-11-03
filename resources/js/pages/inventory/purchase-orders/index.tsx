import { Head, Link, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';

import { DataTable } from '@/components/data-table';
import { Pager } from '@/components/pager';
import { Button } from '@/components/ui/button';
import { cleanQuery, poStatusLabels } from '@/lib/inventory';
import { columnClassNames, getColumns } from '@/pages/inventory/purchase-orders/columns';
import { create, index } from '@/routes/inventory/purchase-orders';
import type { PoStatus, PurchaseOrderRow } from '@/types/inventory';
import type { Paginated } from '@/types/menu';

type Filters = {
    status: PoStatus | null;
    supplier: number | null;
    sort?: string | null;
    direction?: 'asc' | 'desc' | null;
};

type Props = {
    // Optional on the server: undefined until the person asks for it.
    orders?: Paginated<PurchaseOrderRow>;
    statuses: PoStatus[];
    filters: Filters;
};

// Partial reloads: only these props are requested, which is also what makes the optional
// `orders` prop come back.
const ONLY = ['orders', 'filters'];

export default function PurchaseOrdersIndex({ orders, statuses, filters }: Props) {
    const [loading, setLoading] = useState(false);

    // The last page of orders that was loaded. Shown while a refresh is on its way.
    const [loaded, setLoaded] = useState<Paginated<PurchaseOrderRow> | undefined>(orders);
    const data = orders ?? loaded;

    // Memoized so TanStack Table doesn't rebuild columns on every render.
    const columns = useMemo(() => getColumns(), []);

    // Sorting state comes from the server (query string), so it survives reloads and pagination.
    const sorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction === 'desc' }] : []),
        [filters.sort, filters.direction],
    );

    // A new filter or sort. The page number resets to 1.
    function visit(next: Partial<Filters>) {
        router.get(index.url(), cleanQuery({ ...filters, ...next }), {
            only: ONLY,
            preserveState: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    // Asks the server for the data of the page we are already on (same filters, sort and page number).
    function loadOrders() {
        router.reload({
            only: ONLY,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    // Once data has been loaded, keep it loaded: a full visit drops the optional prop, so fetch it again.
    useEffect(() => {
        if (orders) {
            setLoaded(orders);
        } else if (loaded) {
            loadOrders();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orders]);

    function handleSortingChange(next: SortingState) {
        const [first] = next;

        visit({
            sort: first?.id ?? null,
            direction: first ? (first.desc ? 'desc' : 'asc') : null,
        });
    }

    return (
        <>
            <Head title="Purchase orders" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Purchase orders</h1>
                        {data && <p className="text-muted-foreground text-sm">{data.total} total</p>}
                    </div>
                    <Button asChild>
                        <Link href={create.url()}>New purchase order</Link>
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant={filters.status === null ? 'default' : 'outline'} disabled={loading} onClick={() => visit({ status: null })}>
                        All
                    </Button>
                    {statuses.map((status) => (
                        <Button key={status} size="sm" variant={filters.status === status ? 'default' : 'outline'} disabled={loading} onClick={() => visit({ status })}>
                            {poStatusLabels[status]}
                        </Button>
                    ))}
                </div>

                <DataTable
                    columns={columns}
                    data={data?.data ?? []}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    columnClassNames={columnClassNames}
                    emptyContent={
                        data ? (
                            'No purchase orders.'
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm">Purchase orders aren&apos;t loaded yet.</p>
                                <Button onClick={loadOrders} disabled={loading}>
                                    {loading ? 'Loading…' : 'Load purchase orders'}
                                </Button>
                            </div>
                        )
                    }
                />

                {data && <Pager currentPage={data.current_page} lastPage={data.last_page} prevUrl={data.prev_page_url} nextUrl={data.next_page_url} only={ONLY} />}
            </div>
        </>
    );
}

PurchaseOrdersIndex.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: '/inventory/ingredients' },
        { title: 'Purchase orders', href: index() },
    ],
};