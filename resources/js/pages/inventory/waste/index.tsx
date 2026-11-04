import { Head, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/can';
import { DataTable } from '@/components/data-table';
import { Pager } from '@/components/pager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cleanQuery, wasteReasonLabels } from '@/lib/inventory';
import { columnClassNames, getColumns } from '@/pages/inventory/waste/columns';
import WasteDialog from '@/pages/inventory/waste/waste-dialog';
import { index } from '@/routes/inventory/waste';
import type { WasteRow } from '@/types/inventory';
import type { Paginated } from '@/types/menu';

type Filters = {
    search: string;
    ingredient: number | null;
    reason: string | null;
    sort?: string | null;
    direction?: 'asc' | 'desc' | null;
};

type Props = {
    // Optional on the server: undefined until the person asks for it.
    logs?: Paginated<WasteRow>;
    ingredient: { id: number; name: string } | null;
    reasons: string[];
    filters: Filters;
};

const ALL = 'all';

// Partial reloads: only these props are requested, which is also what makes the optional
// `logs` prop come back. `ingredient` is included so the badge follows the filter.
const ONLY = ['logs', 'filters', 'ingredient'];

export default function WasteIndex({ logs, ingredient, reasons, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [loaded, setLoaded] = useState<Paginated<WasteRow> | undefined>(logs);
    const data = logs ?? loaded;

    const filteredByIngredient = ingredient !== null;
    const columns = useMemo(() => getColumns({ filteredByIngredient }), [filteredByIngredient]);

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
                ingredient: merged.ingredient,
                reason: merged.reason,
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

    function loadLogs() {
        router.reload({
            only: ONLY,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    useEffect(() => {
        if (logs) {
            setLoaded(logs);
        } else if (loaded) {
            loadLogs();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logs]);

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
            <Head title="Waste" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Waste log</h1>
                        {data && <p className="text-muted-foreground text-sm">{data.total} entries</p>}
                    </div>
                    <Can permission="inventory.adjust">
                        <Button onClick={() => setOpen(true)}>Log waste</Button>
                    </Can>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <form onSubmit={submitSearch} className="flex min-w-64 max-w-sm flex-1 gap-2">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ingredient or note" aria-label="Search waste log" />
                        <Button type="submit" variant="outline" disabled={loading}>
                            Search
                        </Button>
                    </form>

                    {ingredient && (
                        <Badge variant="secondary" className="gap-1 py-1.5">
                            {ingredient.name}
                            <button type="button" aria-label="Show all ingredients" onClick={() => visit({ ingredient: null })}>
                                <X className="size-3.5" />
                            </button>
                        </Badge>
                    )}

                    <Select value={filters.reason ?? ALL} onValueChange={(value) => visit({ reason: value === ALL ? null : value })}>
                        <SelectTrigger className="w-48" aria-label="Reason">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All reasons</SelectItem>
                            {reasons.map((reason) => (
                                <SelectItem key={reason} value={reason}>
                                    {wasteReasonLabels[reason] ?? reason}
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
                            'No waste logged.'
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm">The waste log isn&apos;t loaded yet.</p>
                                <Button onClick={loadLogs} disabled={loading}>
                                    {loading ? 'Loading…' : 'Load waste log'}
                                </Button>
                            </div>
                        )
                    }
                />

                {data && <Pager currentPage={data.current_page} lastPage={data.last_page} prevUrl={data.prev_page_url} nextUrl={data.next_page_url} only={ONLY} />}
            </div>

            <WasteDialog open={open} onOpenChange={setOpen} />
        </>
    );
}

WasteIndex.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: '/inventory/ingredients' },
        { title: 'Waste', href: index() },
    ],
};
