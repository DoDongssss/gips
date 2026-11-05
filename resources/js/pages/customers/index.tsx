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
import { columnClassNames, getColumns, type CustomerRecord } from '@/pages/customers/columns';
import type { Paginated } from '@/types/menu';

import { index } from '@/routes/customers';

type Filters = {
    search: string;
    has_orders: string | null;
    loyalty: string | null;
    sort?: string | null;
    direction?: 'asc' | 'desc' | null;
};

type Props = {
    customers?: Paginated<CustomerRecord>;
    filters: Filters;
};

const ONLY = ['customers', 'filters'];
const ALL = 'all';

export default function CustomersIndex({ customers, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState<Paginated<CustomerRecord> | undefined>(customers);
    const data = customers ?? loaded;

    const columns = useMemo(() => getColumns(), []);

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
                has_orders: merged.has_orders,
                loyalty: merged.loyalty,
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

    function loadCustomers() {
        router.reload({
            only: ONLY,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    useEffect(() => {
        if (customers) {
            setLoaded(customers);
        } else if (loaded) {
            loadCustomers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customers]);

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
            <Head title="Customers" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Customers</h1>
                        {data && <p className="text-muted-foreground text-sm">{data.total} total</p>}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <form onSubmit={submitSearch} className="flex min-w-64 max-w-sm flex-1 gap-2">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search name, phone, or email"
                            aria-label="Search customers"
                        />
                        <Button type="submit" variant="outline" disabled={loading}>
                            Search
                        </Button>
                    </form>

                    <Select
                        value={filters.has_orders ?? ALL}
                        onValueChange={(value) => visit({ has_orders: value === ALL ? null : value })}
                    >
                        <SelectTrigger className="w-44" aria-label="Orders">
                            <SelectValue placeholder="Orders" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All customers</SelectItem>
                            <SelectItem value="yes">With orders</SelectItem>
                            <SelectItem value="no">No orders yet</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.loyalty ?? ALL}
                        onValueChange={(value) => visit({ loyalty: value === ALL ? null : value })}
                    >
                        <SelectTrigger className="w-44" aria-label="Loyalty">
                            <SelectValue placeholder="Loyalty" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All balances</SelectItem>
                            <SelectItem value="with_points">Has loyalty points</SelectItem>
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
                            'No customers found.'
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm">Customers aren&apos;t loaded yet.</p>
                                <Button onClick={loadCustomers} disabled={loading}>
                                    {loading ? 'Loading…' : 'Load customers'}
                                </Button>
                            </div>
                        )
                    }
                />

                {data && (
                    <Pager
                        currentPage={data.current_page}
                        lastPage={data.last_page}
                        prevUrl={data.prev_page_url}
                        nextUrl={data.next_page_url}
                        only={ONLY}
                    />
                )}
            </div>
        </>
    );
}

CustomersIndex.layout = {
    breadcrumbs: [{ title: 'Customers', href: index() }],
};
