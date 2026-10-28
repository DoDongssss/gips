import { Head, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { DataTable } from '@/components/data-table';
import { Pager } from '@/components/pager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cleanQuery, movementLabels } from '@/lib/inventory';
import { columnClassNames, getColumns } from '@/pages/inventory/movements/columns';
import { index } from '@/routes/inventory/movements';
import type { MovementRow } from '@/types/inventory';
import type { Paginated } from '@/types/menu';

type Filters = {
    ingredient: number | null;
    type: string | null;
    from: string | null;
    to: string | null;
    sort?: string | null;
    direction?: 'asc' | 'desc' | null;
};

type Props = {
    // Optional on the server: undefined until the person asks for it.
    movements?: Paginated<MovementRow>;
    ingredient: { id: number; name: string } | null;
    types: string[];
    filters: Filters;
};

const ALL = 'all';

// Partial reloads: only these props are requested, which is also what makes the optional
// `movements` prop come back. `ingredient` is included so the badge follows the filter.
const ONLY = ['movements', 'filters', 'ingredient'];

export default function MovementsIndex({ movements, ingredient, types, filters }: Props) {
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');
    const [loading, setLoading] = useState(false);

    // The last page of movements that was loaded. Shown while a refresh is on its way.
    const [loaded, setLoaded] = useState<Paginated<MovementRow> | undefined>(movements);
    const data = movements ?? loaded;

    // Memoized so TanStack Table doesn't rebuild columns on every render.
    const filteredByIngredient = ingredient !== null;
    const columns = useMemo(() => getColumns({ filteredByIngredient }), [filteredByIngredient]);

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
    function loadMovements() {
        router.reload({
            only: ONLY,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    // Once data has been loaded, keep it loaded: a full visit drops the optional prop, so fetch it again.
    useEffect(() => {
        if (movements) {
            setLoaded(movements);
        } else if (loaded) {
            loadMovements();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [movements]);

    function handleSortingChange(next: SortingState) {
        const [first] = next;

        visit({
            sort: first?.id ?? null,
            direction: first ? (first.desc ? 'desc' : 'asc') : null,
        });
    }

    return (
        <>
            <Head title="Stock movements" />

            <div className="space-y-6 p-6">
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold tracking-tight">Stock movements</h1>
                    <p className="text-muted-foreground text-sm">Every change to stock, newest first. This is the ledger; the on-hand numbers are its sum.</p>
                    {data && <p className="text-muted-foreground text-sm">{data.total} total</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {ingredient && (
                        <Badge variant="secondary" className="gap-1 py-1.5">
                            {ingredient.name}
                            <button type="button" aria-label="Show all ingredients" onClick={() => visit({ ingredient: null })}>
                                <X className="size-3.5" />
                            </button>
                        </Badge>
                    )}

                    <Select value={filters.type || ALL} onValueChange={(value) => visit({ type: value === ALL ? null : value })}>
                        <SelectTrigger className="w-44" aria-label="Type">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All types</SelectItem>
                            {types.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {movementLabels[type] ?? type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Input type="date" className="w-40" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
                    <Input type="date" className="w-40" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} />
                    <Button variant="outline" disabled={loading} onClick={() => visit({ from: from || null, to: to || null })}>
                        Apply dates
                    </Button>
                </div>

                <DataTable
                    columns={columns}
                    data={data?.data ?? []}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    columnClassNames={columnClassNames}
                    emptyContent={
                        data ? (
                            'No movements match.'
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm">Movements aren&apos;t loaded yet.</p>
                                <Button onClick={loadMovements} disabled={loading}>
                                    {loading ? 'Loading…' : 'Load movements'}
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

MovementsIndex.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: '/inventory/ingredients' },
        { title: 'Movements', href: index() },
    ],
};