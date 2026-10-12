import { Head, Link, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/can';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { columnClassNames, getColumns } from '@/pages/orders/columns';
import type { OrderRow } from '@/pages/orders/types';
import { index } from '@/routes/orders';
import { index as posIndex } from '@/routes/pos';

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type Filters = {
    date: string;
    search: string;
    status: string;
    payment_status: string;
    channel: string;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
};

type Props = {
    // Optional on the server: undefined until the person asks for it.
    orders?: Paginated<OrderRow>;
    filters: Filters;
};

type Params = Partial<Omit<Filters, 'sort' | 'direction'>> & { sort?: string | null; direction?: 'asc' | 'desc' | null };

// Partial reloads: only these props are requested, which is also what makes
// the optional `orders` prop come back.
const ONLY = ['orders', 'filters'];
const ALL = 'all';

const STATUSES = ['open', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'voided'];
const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid', 'refunded'];
const CHANNELS = ['pos', 'kiosk', 'online', 'delivery'];

const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export default function Index({ orders, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    const columns = useMemo(() => getColumns(), []);

    // Sorting state comes from the server (query string), so it survives reloads and pagination.
    const sorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction === 'desc' }] : []),
        [filters.sort, filters.direction],
    );

    function visit(next: Params) {
        const merged = { ...filters, ...next };

        router.get(
            index.url(),
            {
                date: merged.date || undefined,
                search: merged.search || undefined,
                status: merged.status || undefined,
                payment_status: merged.payment_status || undefined,
                channel: merged.channel || undefined,
                sort: merged.sort ?? undefined,
                direction: merged.direction ?? undefined,
            },
            {
                only: ONLY,
                preserveState: true,
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    }

    function loadOrders() {
        visit({});
    }

    // Once data has been loaded, keep it loaded. Actions elsewhere redirect with a full visit
    // that drops the optional prop, so fetch it again.
    useEffect(() => {
        if (orders) {
            setHasLoaded(true);
        } else if (hasLoaded) {
            loadOrders();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orders]);

    function submitSearch(event: FormEvent) {
        event.preventDefault();
        visit({ search });
    }

    function handleSortingChange(next: SortingState) {
        const [first] = next;
        visit({ sort: first?.id ?? null, direction: first ? (first.desc ? 'desc' : 'asc') : null });
    }

    function filterSelect(key: 'status' | 'payment_status' | 'channel', placeholder: string, values: string[]) {
        return (
            <Select value={filters[key] || ALL} onValueChange={(value) => visit({ [key]: value === ALL ? '' : value } as Params)}>
                <SelectTrigger className="w-40" aria-label={placeholder}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL}>{placeholder}</SelectItem>
                    {values.map((value) => (
                        <SelectItem key={value} value={value}>
                            {label(value)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    return (
        <>
            <Head title="Orders" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Orders</h1>
                        <p className="text-muted-foreground text-sm">
                            Business day {filters.date}
                            {orders && ` · ${orders.total} order${orders.total === 1 ? '' : 's'}`}
                        </p>
                    </div>

                    <Can permission="order.create">
                        <Button asChild>
                            <Link href={posIndex.url()}>Open register</Link>
                        </Button>
                    </Can>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <form onSubmit={submitSearch} className="flex w-full max-w-sm gap-2">
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order number or customer" aria-label="Search orders" />
                        <Button type="submit" variant="outline" disabled={loading}>
                            Search
                        </Button>
                    </form>

                    {filterSelect('status', 'All statuses', STATUSES)}
                    {filterSelect('payment_status', 'All payments', PAYMENT_STATUSES)}
                    {filterSelect('channel', 'All channels', CHANNELS)}

                    <Input
                        type="date"
                        className="w-44"
                        aria-label="Business day"
                        value={filters.date}
                        onChange={(event) => event.target.value && visit({ date: event.target.value })}
                    />
                </div>

                <DataTable
                    columns={columns}
                    data={orders?.data ?? []}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    columnClassNames={columnClassNames}
                    emptyContent={
                        orders ? (
                            'No orders found for these filters.'
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm">Orders aren&apos;t loaded yet.</p>
                                <Button onClick={loadOrders} disabled={loading}>
                                    {loading ? 'Loading…' : 'Load orders'}
                                </Button>
                            </div>
                        )
                    }
                />

                {orders && orders.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-muted-foreground text-sm">
                            Page {orders.current_page} of {orders.last_page}
                        </p>
                        <div className="flex gap-2">
                            {orders.prev_page_url ? (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={orders.prev_page_url} only={ONLY} preserveState>
                                        Previous
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" disabled>
                                    Previous
                                </Button>
                            )}
                            {orders.next_page_url ? (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={orders.next_page_url} only={ONLY} preserveState>
                                        Next
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" disabled>
                                    Next
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Orders', href: index() }],
};
