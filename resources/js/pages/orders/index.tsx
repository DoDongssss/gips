import { Head, Link, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';

import { Can } from '@/components/shared/can';
import { DataTable } from '@/components/shared/data-table';
import { Pager } from '@/components/shared/pager';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { errorMessages } from '@/lib/api';
import { formatPeso } from '@/lib/money';
import { lookupOrder } from '@/lib/pos/api';
import { columnClassNames, getColumns } from '@/pages/orders/columns';
import type { OrderRow, OrderSummary } from '@/types/orders';
import { index } from '@/routes/orders';
import { show } from '@/routes/orders';
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
    date_end: string;
    search: string;
    status: string;
    payment_status: string;
    channel: string;
    type: string;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    highlight: number | null;
};

type Props = {
    orders?: Paginated<OrderRow>;
    summary?: OrderSummary;
    filters: Filters;
};

type Params = Partial<Filters> & { sort?: string | null; direction?: 'asc' | 'desc' | null };

const ONLY = ['orders', 'filters', 'summary'];
const ALL = 'all';

const STATUSES = ['open', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'voided'];
const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid', 'refunded'];
const CHANNELS = ['pos', 'kiosk', 'online', 'delivery'];
const TYPES = ['dine_in', 'takeout', 'delivery'];

const label = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function Index({ orders, summary, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [lookupOpen, setLookupOpen] = useState(false);
    const [lookupNumber, setLookupNumber] = useState('');
    const [lookupPending, setLookupPending] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const columns = useMemo(() => getColumns({ highlightId: filters.highlight }), [filters.highlight]);

    const sorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction === 'desc' }] : []),
        [filters.sort, filters.direction],
    );

    function queryParams(next: Params = {}, page?: number) {
        const merged = { ...filters, ...next };

        const params: Record<string, string | number | undefined> = {
            date: merged.date || undefined,
            date_end: merged.date_end !== merged.date ? merged.date_end : undefined,
            search: merged.search || undefined,
            status: merged.status || undefined,
            payment_status: merged.payment_status || undefined,
            channel: merged.channel || undefined,
            type: merged.type || undefined,
            sort: merged.sort ?? undefined,
            direction: merged.direction ?? undefined,
            highlight: merged.highlight ?? undefined,
        };

        if (page !== undefined) {
            params.page = page > 1 ? page : undefined;
        }

        return params;
    }

    function visit(next: Params = {}, options: { resetPage?: boolean; page?: number } = {}) {
        const resetPage = options.resetPage ?? Object.keys(next).length > 0;
        const page = options.page ?? (resetPage ? 1 : orders?.current_page ?? 1);

        router.get(
            index.url({ query: queryParams(next, page) }),
            {},
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

    function loadOrders() {
        visit({});
    }

    useEffect(() => {
        if (orders) {
            setHasLoaded(true);
        } else if (hasLoaded) {
            loadOrders();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orders]);

    useEffect(() => {
        setSearch(filters.search ?? '');
    }, [filters.search]);

    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            if (search !== (filters.search ?? '')) {
                visit({ search });
            }
        }, 400);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => {
        if (!hasLoaded || !orders) {
            return;
        }

        const timer = setInterval(() => visit({}, { resetPage: false, page: orders.current_page }), 30_000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasLoaded, filters.date, filters.date_end, filters.status, filters.payment_status, filters.channel, filters.type]);

    function submitSearch(event: FormEvent) {
        event.preventDefault();
        visit({ search });
    }

    function handleSortingChange(next: SortingState) {
        const [first] = next;
        visit({ sort: first?.id ?? null, direction: first ? (first.desc ? 'desc' : 'asc') : null });
    }

    function clearFilters() {
        setSearch('');
        visit({
            search: '',
            status: '',
            payment_status: '',
            channel: '',
            type: '',
            highlight: null,
        });
    }

    const filtersActive =
        Boolean(filters.search) ||
        Boolean(filters.status) ||
        Boolean(filters.payment_status) ||
        Boolean(filters.channel) ||
        Boolean(filters.type) ||
        filters.date_end !== filters.date;

    const exportUrl = `/orders/export?${new URLSearchParams(
        Object.entries(queryParams()).filter(([, v]) => v !== undefined && v !== null) as [string, string][],
    )}`;

    async function submitLookup(event: FormEvent) {
        event.preventDefault();
        const trimmed = lookupNumber.trim();

        if (!trimmed) {
            return;
        }

        setLookupPending(true);

        try {
            const found = await lookupOrder(trimmed);
            setLookupOpen(false);
            setLookupNumber('');
            router.visit(show.url(found.id));
        } catch (error) {
            toast.error(errorMessages(error)[0] ?? 'Order not found for today.');
        } finally {
            setLookupPending(false);
        }
    }

    function filterSelect(key: 'status' | 'payment_status' | 'channel' | 'type', placeholder: string, values: string[]) {
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

    const dateLabel =
        filters.date_end === filters.date ? filters.date : `${filters.date} → ${filters.date_end}`;

    return (
        <>
            <Head title="Orders" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Orders</h1>
                        <p className="text-muted-foreground text-sm">
                            Business {dateLabel}
                            {orders && ` · ${orders.total} on this page (${summary?.count ?? '…'} matching)`}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setLookupOpen(true)}>
                            Lookup number
                        </Button>
                        <Can permission="order.view">
                            <Button variant="outline" asChild>
                                <a href={exportUrl} download>
                                    Export CSV
                                </a>
                            </Button>
                        </Can>
                        <Can permission="order.create">
                            <Button asChild>
                                <Link href={posIndex.url()}>Open register</Link>
                            </Button>
                        </Can>
                    </div>
                </div>

                {summary && (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <div className="rounded-lg border px-4 py-3 text-sm">
                            <p className="text-muted-foreground">Orders</p>
                            <p className="text-lg font-semibold tabular-nums">{summary.count}</p>
                        </div>
                        <div className="rounded-lg border px-4 py-3 text-sm">
                            <p className="text-muted-foreground">Gross total</p>
                            <p className="text-lg font-semibold tabular-nums">{formatPeso(summary.total_cents)}</p>
                        </div>
                        <div className="rounded-lg border px-4 py-3 text-sm">
                            <p className="text-muted-foreground">Paid</p>
                            <p className="text-lg font-semibold tabular-nums">{formatPeso(summary.paid_cents)}</p>
                        </div>
                        <div className="rounded-lg border px-4 py-3 text-sm">
                            <p className="text-muted-foreground">Discounts</p>
                            <p className="text-lg font-semibold tabular-nums">{formatPeso(summary.discount_cents)}</p>
                        </div>
                        <div className="rounded-lg border px-4 py-3 text-sm">
                            <p className="text-muted-foreground">Voided</p>
                            <p className="text-lg font-semibold tabular-nums">{summary.void_count}</p>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                    <form onSubmit={submitSearch} className="flex min-w-64 max-w-sm flex-1 gap-2">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Order number or customer"
                            aria-label="Search orders"
                        />
                        <Button type="submit" variant="outline" disabled={loading}>
                            Search
                        </Button>
                    </form>

                    {filterSelect('status', 'All statuses', STATUSES)}
                    {filterSelect('payment_status', 'All payments', PAYMENT_STATUSES)}
                    {filterSelect('channel', 'All channels', CHANNELS)}
                    {filterSelect('type', 'All types', TYPES)}

                    <Input
                        type="date"
                        className="w-40"
                        aria-label="From business date"
                        value={filters.date}
                        onChange={(event) => event.target.value && visit({ date: event.target.value })}
                    />
                    <Input
                        type="date"
                        className="w-40"
                        aria-label="To business date"
                        value={filters.date_end}
                        onChange={(event) => event.target.value && visit({ date_end: event.target.value })}
                    />

                    {filtersActive && (
                        <Button type="button" variant="ghost" onClick={clearFilters}>
                            Clear filters
                        </Button>
                    )}
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

                {orders && (
                    <Pager
                        currentPage={orders.current_page}
                        lastPage={orders.last_page}
                        prevUrl={orders.prev_page_url}
                        nextUrl={orders.next_page_url}
                        only={ONLY}
                    />
                )}
            </div>

            <Dialog open={lookupOpen} onOpenChange={setLookupOpen}>
                <DialogContent>
                    <form onSubmit={submitLookup} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>Lookup order</DialogTitle>
                            <DialogDescription>Find today&apos;s order by its pickup number (for example A-023).</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                            <Label htmlFor="lookup-number">Order number</Label>
                            <Input
                                id="lookup-number"
                                value={lookupNumber}
                                onChange={(event) => setLookupNumber(event.target.value)}
                                placeholder="A-023"
                                autoFocus
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setLookupOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={lookupPending}>
                                {lookupPending ? 'Looking up…' : 'Open order'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Orders', href: index() }],
};
