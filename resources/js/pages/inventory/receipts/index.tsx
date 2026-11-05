import { Head, Link, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/shared/can';
import { DataTable } from '@/components/shared/data-table';
import { Pager } from '@/components/shared/pager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cleanQuery } from '@/lib/inventory';
import { columnClassNames, getColumns } from '@/pages/inventory/receipts/columns';
import { create, index } from '@/routes/inventory/receipts';
import type { ReceiptRow } from '@/types/inventory';
import type { Paginated } from '@/types/menu';

type Filters = {
    search: string;
    supplier: number | null;
    sort?: string | null;
    direction?: 'asc' | 'desc' | null;
};

type Props = {
    // Optional on the server: undefined until the person asks for it.
    receipts?: Paginated<ReceiptRow>;
    supplier: { id: number; name: string } | null;
    suppliers: { id: number; name: string }[];
    filters: Filters;
};

const ALL = 'all';

const ONLY = ['receipts', 'filters', 'supplier'];

export default function ReceiptsIndex({ receipts, supplier, suppliers, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [loading, setLoading] = useState(false);

    const [loaded, setLoaded] = useState<Paginated<ReceiptRow> | undefined>(receipts);
    const data = receipts ?? loaded;

    const filteredBySupplier = supplier !== null;
    const columns = useMemo(() => getColumns({ filteredBySupplier }), [filteredBySupplier]);

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
                supplier: merged.supplier,
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

    function loadReceipts() {
        router.reload({
            only: ONLY,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    useEffect(() => {
        if (receipts) {
            setLoaded(receipts);
        } else if (loaded) {
            loadReceipts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [receipts]);

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
            <Head title="Receiving" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Goods receiving</h1>
                        <p className="text-muted-foreground text-sm">Deliveries that added stock. Receive against a purchase order, or record a delivery without one.</p>
                        {data && <p className="text-muted-foreground text-sm">{data.total} total</p>}
                    </div>
                    <Can permission="inventory.receive">
                        <Button asChild>
                            <Link href={create.url()}>Receive a delivery</Link>
                        </Button>
                    </Can>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <form onSubmit={submitSearch} className="flex min-w-64 max-w-sm flex-1 gap-2">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search receipt, invoice, supplier, or PO"
                            aria-label="Search receipts"
                        />
                        <Button type="submit" variant="outline" disabled={loading}>
                            Search
                        </Button>
                    </form>

                    {supplier && (
                        <Badge variant="secondary" className="gap-1 py-1.5">
                            {supplier.name}
                            <button type="button" aria-label="Show all suppliers" onClick={() => visit({ supplier: null })}>
                                <X className="size-3.5" />
                            </button>
                        </Badge>
                    )}

                    <Select value={filters.supplier ? String(filters.supplier) : ALL} onValueChange={(value) => visit({ supplier: value === ALL ? null : Number(value) })}>
                        <SelectTrigger className="w-48" aria-label="Supplier">
                            <SelectValue placeholder="Supplier" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All suppliers</SelectItem>
                            {suppliers.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                    {s.name}
                                </SelectItem>
                            ))}
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
                            'No deliveries received yet.'
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm">Receipts aren&apos;t loaded yet.</p>
                                <Button onClick={loadReceipts} disabled={loading}>
                                    {loading ? 'Loading…' : 'Load receipts'}
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

ReceiptsIndex.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: '/inventory/ingredients' },
        { title: 'Receiving', href: index() },
    ],
};
