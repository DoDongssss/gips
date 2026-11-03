import { Head, Link, router, useForm } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/can';
import { DataTable } from '@/components/data-table';
import { Field, FormError } from '@/components/inventory/field';
import { Pager } from '@/components/pager';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cleanQuery } from '@/lib/inventory';
import { columnClassNames, getColumns } from '@/pages/inventory/counts/columns';
import { index, show, store } from '@/routes/inventory/counts';
import type { CountRow } from '@/types/inventory';
import type { Paginated } from '@/types/menu';

type Filters = {
    sort?: string | null;
    direction?: 'asc' | 'desc' | null;
};

type Props = {
    // Optional on the server: undefined until the person asks for it.
    counts?: Paginated<CountRow>;
    open_count_id: number | null;
    filters: Filters;
};

// Partial reloads: only these props are requested, which is also what makes the optional
// `counts` prop come back.
const ONLY = ['counts', 'filters'];

export default function CountsIndex({ counts, open_count_id, filters }: Props) {
    const [starting, setStarting] = useState(false);
    const [loading, setLoading] = useState(false);
    const form = useForm({ notes: '' });
    const errors = form.errors as Record<string, string>;

    // The last page of counts that was loaded. Shown while a refresh is on its way.
    const [loaded, setLoaded] = useState<Paginated<CountRow> | undefined>(counts);
    const data = counts ?? loaded;

    // Memoized so TanStack Table doesn't rebuild columns on every render.
    const columns = useMemo(() => getColumns(), []);

    // Sorting state comes from the server (query string), so it survives reloads and pagination.
    const sorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction === 'desc' }] : []),
        [filters.sort, filters.direction],
    );

    // A new sort. The page number resets to 1.
    function visit(next: Partial<Filters>) {
        router.get(index.url(), cleanQuery({ ...filters, ...next }), {
            only: ONLY,
            preserveState: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    // Asks the server for the data of the page we are already on (same sort and page number).
    function loadCounts() {
        router.reload({
            only: ONLY,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    // Once data has been loaded, keep it loaded: a full visit drops the optional prop, so fetch it again.
    useEffect(() => {
        if (counts) {
            setLoaded(counts);
        } else if (loaded) {
            loadCounts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [counts]);

    function handleSortingChange(next: SortingState) {
        const [first] = next;

        visit({
            sort: first?.id ?? null,
            direction: first ? (first.desc ? 'desc' : 'asc') : null,
        });
    }

    function start(event: FormEvent) {
        event.preventDefault();
        form.transform((data) => ({ notes: data.notes.trim() || null }));
        form.post(store.url());
    }

    return (
        <>
            <Head title="Stock counts" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Stock counts</h1>
                        <p className="text-muted-foreground text-sm">Count the shelves; differences are posted to the stock history.</p>
                        {data && <p className="text-muted-foreground text-sm">{data.total} total</p>}
                    </div>
                    <Can permission="inventory.count">
                        {open_count_id ? (
                            <Button asChild>
                                <Link href={show.url(open_count_id)}>Continue count #{open_count_id}</Link>
                            </Button>
                        ) : (
                            <Button onClick={() => setStarting(true)}>Start a count</Button>
                        )}
                    </Can>
                </div>

                <DataTable
                    columns={columns}
                    data={data?.data ?? []}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    columnClassNames={columnClassNames}
                    emptyContent={
                        data ? (
                            'No counts yet.'
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm">Counts aren&apos;t loaded yet.</p>
                                <Button onClick={loadCounts} disabled={loading}>
                                    {loading ? 'Loading…' : 'Load counts'}
                                </Button>
                            </div>
                        )
                    }
                />

                {data && <Pager currentPage={data.current_page} lastPage={data.last_page} prevUrl={data.prev_page_url} nextUrl={data.next_page_url} only={ONLY} />}
            </div>

            <Dialog open={starting} onOpenChange={setStarting}>
                <DialogContent>
                    <form onSubmit={start} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>Start a stock count</DialogTitle>
                            <DialogDescription>
                                Takes a snapshot of what the system thinks is on hand for every active ingredient. Sales rung up while you count are not lost.
                            </DialogDescription>
                        </DialogHeader>
                        <FormError message={errors.error} />
                        <Field id="count-notes" label="Note (optional)" error={errors.notes}>
                            <Input id="count-notes" placeholder="e.g. Month-end count" value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setStarting(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Starting…' : 'Start count'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

CountsIndex.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: '/inventory/ingredients' },
        { title: 'Counts', href: index() },
    ],
};