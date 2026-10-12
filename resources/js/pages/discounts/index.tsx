import { Head, Link, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/can';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { columnClassNames, getColumns } from '@/pages/discounts/columns';
import DiscountFormDialog from '@/pages/discounts/form-dialog';
import type { DiscountRecord } from '@/pages/discounts/form-dialog';
import { index } from '@/routes/discounts';

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type Props = {
    // Optional on the server: undefined until the person asks for it.
    discounts?: Paginated<DiscountRecord>;
    filters: { search: string; sort?: string | null; direction?: 'asc' | 'desc' | null };
};

type DialogState = {
    open: boolean;
    mode: 'create' | 'edit';
    discount?: DiscountRecord;
};

// Partial reloads: only these props are requested, which is also what makes
// the optional `discounts` prop come back.
const ONLY = ['discounts', 'filters'];

export default function Index({ discounts, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [dialog, setDialog] = useState<DialogState>({ open: false, mode: 'create' });
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Memoized so TanStack Table doesn't rebuild columns on every render.
    const columns = useMemo(() => getColumns({ onEdit: (discount) => setDialog({ open: true, mode: 'edit', discount }) }), []);

    // Sorting state comes from the server (query string), so it survives reloads and pagination.
    const sorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction === 'desc' }] : []),
        [filters.sort, filters.direction],
    );

    function visit(params: { search?: string; sort?: string | null; direction?: 'asc' | 'desc' | null }) {
        router.get(
            index.url(),
            {
                search: params.search || undefined,
                sort: params.sort ?? undefined,
                direction: params.direction ?? undefined,
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

    function loadDiscounts() {
        visit({ search: filters.search, sort: filters.sort, direction: filters.direction });
    }

    // Once data has been loaded, keep it loaded. A save redirects back with a full visit
    // that drops the optional prop, so fetch it again.
    useEffect(() => {
        if (discounts) {
            setHasLoaded(true);
        } else if (hasLoaded) {
            loadDiscounts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [discounts]);

    function submitSearch(event: FormEvent) {
        event.preventDefault();
        visit({ search, sort: filters.sort, direction: filters.direction });
    }

    function handleSortingChange(next: SortingState) {
        const [first] = next;
        visit({
            search: filters.search,
            sort: first?.id,
            direction: first ? (first.desc ? 'desc' : 'asc') : undefined,
        });
    }

    return (
        <>
            <Head title="Discounts" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Discounts</h1>
                        {discounts && <p className="text-muted-foreground text-sm">{discounts.total} total</p>}
                    </div>

                    <Can permission="discount.manage">
                        <Button onClick={() => setDialog({ open: true, mode: 'create', discount: undefined })}>Add discount</Button>
                    </Can>
                </div>

                <form onSubmit={submitSearch} className="flex max-w-sm gap-2">
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or code" aria-label="Search discounts" />
                    <Button type="submit" variant="outline" disabled={loading}>
                        Search
                    </Button>
                </form>

                <DataTable
                    columns={columns}
                    data={discounts?.data ?? []}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    columnClassNames={columnClassNames}
                    emptyContent={
                        discounts ? (
                            'No discounts found.'
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm">Discounts aren&apos;t loaded yet.</p>
                                <Button onClick={loadDiscounts} disabled={loading}>
                                    {loading ? 'Loading…' : 'Load discounts'}
                                </Button>
                            </div>
                        )
                    }
                />

                {discounts && discounts.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-muted-foreground text-sm">
                            Page {discounts.current_page} of {discounts.last_page}
                        </p>
                        <div className="flex gap-2">
                            {discounts.prev_page_url ? (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={discounts.prev_page_url} only={ONLY} preserveState>
                                        Previous
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" disabled>
                                    Previous
                                </Button>
                            )}
                            {discounts.next_page_url ? (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={discounts.next_page_url} only={ONLY} preserveState>
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

            <DiscountFormDialog
                open={dialog.open}
                onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
                mode={dialog.mode}
                discount={dialog.discount}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Discounts', href: index() }],
};
