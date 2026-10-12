import { Link, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/can';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { columnClassNames, getColumns } from '@/pages/menu/categories/columns';
import CategoryFormDialog from '@/pages/menu/categories/form_dialog';
import type { CategoryRecord } from '@/pages/menu/categories/form_dialog';
import { destroy, index } from '@/routes/menu/categories';

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
    categories?: Paginated<CategoryRecord>;
    filters: { search: string; sort?: string | null; direction?: 'asc' | 'desc' | null };
};

type DialogState = {
    open: boolean;
    mode: 'create' | 'edit';
    category?: CategoryRecord;
};

// Partial reloads: only these props are requested, which is also what makes
// the optional `categories` prop come back.
const ONLY = ['categories', 'filters'];

export default function Index({ categories, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [dialog, setDialog] = useState<DialogState>({ open: false, mode: 'create' });
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    function remove(category: CategoryRecord) {
        if (confirm(`Delete "${category.name}"?`)) {
            router.delete(destroy.url(category.id), { preserveScroll: true });
        }
    }

    // Memoized so TanStack Table doesn't rebuild columns on every render.
    const columns = useMemo(
        () =>
            getColumns({
                onEdit: (category) => setDialog({ open: true, mode: 'edit', category }),
                onDelete: remove,
            }),
        [],
    );

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

    function loadCategories() {
        visit({ search: filters.search, sort: filters.sort, direction: filters.direction });
    }

    // Once data has been loaded, keep it loaded. A save or delete redirects back
    // with a full visit that drops the optional prop, so fetch it again.
    useEffect(() => {
        if (categories) {
            setHasLoaded(true);
        } else if (hasLoaded) {
            loadCategories();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories]);

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
            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Categories</h1>
                        {categories && <p className="text-muted-foreground text-sm">{categories.total} total</p>}
                    </div>

                    <Can permission="menu.create">
                        <Button onClick={() => setDialog({ open: true, mode: 'create', category: undefined })}>
                            Add category
                        </Button>
                    </Can>
                </div>

                <form onSubmit={submitSearch} className="flex max-w-sm gap-2">
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories" />
                    <Button type="submit" variant="outline" disabled={loading}>
                        Search
                    </Button>
                </form>

                <DataTable
                    columns={columns}
                    data={categories?.data ?? []}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    columnClassNames={columnClassNames}
                    emptyContent={
                        categories ? (
                            'No categories found.'
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm">Categories aren&apos;t loaded yet.</p>
                                <Button onClick={loadCategories} disabled={loading}>
                                    {loading ? 'Loading…' : 'Load categories'}
                                </Button>
                            </div>
                        )
                    }
                />

                {categories && categories.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-muted-foreground text-sm">
                            Page {categories.current_page} of {categories.last_page}
                        </p>
                        <div className="flex gap-2">
                            {categories.prev_page_url ? (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={categories.prev_page_url} only={ONLY} preserveState>
                                        Previous
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" disabled>
                                    Previous
                                </Button>
                            )}
                            {categories.next_page_url ? (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={categories.next_page_url} only={ONLY} preserveState>
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

            <CategoryFormDialog
                open={dialog.open}
                onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
                mode={dialog.mode}
                category={dialog.category}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Menu', href: '/menu/products' },
        { title: 'Categories', href: index() },
    ],
};