import { Head, router, usePage } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/shared/can';
import { DataTable } from '@/components/shared/data-table';
import { Pager } from '@/components/shared/pager';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCan } from '@/hooks/shared/use-can';
import { columnClassNames, getColumns } from '@/pages/menu/categories/columns';
import { DeleteCategoryDialog } from '@/pages/menu/categories/delete-category-dialog';
import CategoryFormDialog from '@/pages/menu/categories/form_dialog';
import type { CategoryRecord } from '@/pages/menu/categories/form_dialog';
import { index } from '@/routes/menu/categories';
import { index as productsIndex } from '@/routes/menu/products';
import type { Option, Paginated } from '@/types/menu';

type Filters = {
    search: string;
    status?: string | null;
    trashed?: boolean;
    sort?: string | null;
    direction?: 'asc' | 'desc' | null;
};

type Props = {
    categories?: Paginated<CategoryRecord>;
    stations: Option[];
    filters: Filters;
};

type DialogState = {
    open: boolean;
    mode: 'create' | 'edit';
    category?: CategoryRecord;
};

const ONLY = ['categories', 'filters'];
const ALL = 'all';

export default function Index({ categories, stations, filters }: Props) {
    const { can } = useCan();
    const canUpdate = can('menu.update');
    const canCreate = can('menu.create');
    const canDelete = can('menu.delete');

    const pageErrors = usePage().props.errors as Record<string, string | undefined>;

    const [search, setSearch] = useState(filters.search ?? '');
    const [dialog, setDialog] = useState<DialogState>({ open: false, mode: 'create' });
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [deleteTarget, setDeleteTarget] = useState<CategoryRecord | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const canReorder = !filters.search && !filters.trashed && canUpdate;
    const rows = categories?.data ?? [];

    const sorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction === 'desc' }] : []),
        [filters.sort, filters.direction],
    );

    function queryParams(next: Partial<Filters> = {}) {
        const merged = { ...filters, ...next };

        return {
            search: merged.search || undefined,
            status: merged.status || undefined,
            trashed: merged.trashed ? '1' : undefined,
            sort: merged.sort ?? undefined,
            direction: merged.direction ?? undefined,
        };
    }

    function visit(next: Partial<Filters> = {}) {
        router.get(index.url(), queryParams(next), {
            only: ONLY,
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    function loadCategories() {
        visit();
    }

    /** POST redirects do not replay partial `only` headers; reload the lazy list explicitly. */
    function refreshList() {
        visit();
    }

    useEffect(() => {
        if (categories) {
            setHasLoaded(true);
            setSelectedIds(new Set());
        } else if (hasLoaded) {
            loadCategories();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories]);

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
        visit({ search: '', status: null, trashed: false });
    }

    const filtersActive = Boolean(filters.search) || Boolean(filters.status) || Boolean(filters.trashed);

    const exportUrl = `/menu/categories/export?${new URLSearchParams(
        Object.entries(queryParams()).filter(([, v]) => v !== undefined && v !== null) as [string, string][],
    )}`;

    function duplicateCategory(category: CategoryRecord) {
        router.post(`/menu/categories/${category.id}/duplicate`, {}, { preserveScroll: true, onSuccess: refreshList });
    }

    function moveCategory(category: CategoryRecord, direction: 'up' | 'down') {
        router.post(`/menu/categories/${category.id}/move`, { direction }, { preserveScroll: true, onSuccess: refreshList });
    }

    function restoreCategory(category: CategoryRecord) {
        router.post(`/menu/categories/${category.id}/restore`, {}, { preserveScroll: true, onSuccess: refreshList });
    }

    function confirmDelete() {
        if (!deleteTarget) {
            return;
        }

        router.delete(`/menu/categories/${deleteTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeleteTarget(null);
                refreshList();
            },
        });
    }

    function bulk(action: string) {
        const ids = [...selectedIds];

        if (ids.length === 0) {
            return;
        }

        router.post('/menu/categories/bulk', { action, ids }, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedIds(new Set());
                refreshList();
            },
        });
    }

    const columns = useMemo(
        () =>
            getColumns({
                canUpdate,
                canCreate,
                canDelete,
                canReorder,
                trashed: Boolean(filters.trashed),
                onEdit: (category) => setDialog({ open: true, mode: 'edit', category }),
                onDelete: setDeleteTarget,
                onDuplicate: duplicateCategory,
                onMove: moveCategory,
                onRestore: restoreCategory,
                selectedIds,
                onToggle: (id, checked) =>
                    setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (checked) {
                            next.add(id);
                        } else {
                            next.delete(id);
                        }

                        return next;
                    }),
                onToggleAll: (checked, pageRows) =>
                    setSelectedIds((prev) => {
                        const next = new Set(prev);
                        pageRows.forEach((row) => (checked ? next.add(row.id) : next.delete(row.id)));

                        return next;
                    }),
                rows,
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [canUpdate, canCreate, canDelete, canReorder, filters.trashed, selectedIds, rows],
    );

    return (
        <>
            <Head title="Categories" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">{filters.trashed ? 'Deleted categories' : 'Categories'}</h1>
                        {categories && <p className="text-muted-foreground text-sm">{categories.total} total</p>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Can permission="menu.view">
                            <Button variant="outline" asChild>
                                <a href={exportUrl} download>
                                    Export CSV
                                </a>
                            </Button>
                        </Can>
                        <Can permission="menu.create">
                            {!filters.trashed && (
                                <Button onClick={() => setDialog({ open: true, mode: 'create', category: undefined })}>Add category</Button>
                            )}
                        </Can>
                    </div>
                </div>

                {pageErrors.category && (
                    <Alert variant="destructive">
                        <AlertDescription>{pageErrors.category}</AlertDescription>
                    </Alert>
                )}

                <div className="flex flex-wrap gap-2">
                    <form onSubmit={submitSearch} className="flex min-w-64 max-w-sm flex-1 gap-2">
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories" />
                        <Button type="submit" variant="outline" disabled={loading}>
                            Search
                        </Button>
                    </form>

                    <Select value={filters.status ?? ALL} onValueChange={(value) => visit({ status: value === ALL ? null : value })}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All statuses</SelectItem>
                            <SelectItem value="active">Visible</SelectItem>
                            <SelectItem value="inactive">Hidden</SelectItem>
                        </SelectContent>
                    </Select>

                    {canDelete && (
                        <Button variant={filters.trashed ? 'default' : 'outline'} onClick={() => visit({ trashed: !filters.trashed })}>
                            {filters.trashed ? 'Back to active' : 'Deleted'}
                        </Button>
                    )}

                    {filtersActive && (
                        <Button type="button" variant="ghost" onClick={clearFilters}>
                            Clear filters
                        </Button>
                    )}
                </div>

                {canReorder && <p className="text-muted-foreground text-xs">Use the arrows to change the order categories appear on the POS and kiosk.</p>}

                {selectedIds.size > 0 && canUpdate && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
                        <span className="text-sm font-medium">{selectedIds.size} selected</span>
                        <Button type="button" size="sm" variant="outline" onClick={() => bulk('show')}>
                            Show on menu
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => bulk('hide')}>
                            Hide
                        </Button>
                        {canDelete && (
                            <Button type="button" size="sm" variant="destructive" onClick={() => bulk('delete')}>
                                Delete
                            </Button>
                        )}
                    </div>
                )}

                <DataTable
                    columns={columns}
                    data={rows}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    columnClassNames={columnClassNames}
                    emptyContent={
                        categories ? (
                            <div className="flex flex-col items-center gap-2 py-4">
                                <p>No categories found.</p>
                                {canCreate && !filters.trashed && (
                                    <Button size="sm" variant="outline" onClick={() => setDialog({ open: true, mode: 'create' })}>
                                        Add category
                                    </Button>
                                )}
                            </div>
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

                {categories && (
                    <Pager currentPage={categories.current_page} lastPage={categories.last_page} prevUrl={categories.prev_page_url} nextUrl={categories.next_page_url} only={ONLY} />
                )}
            </div>

            <CategoryFormDialog
                open={dialog.open}
                onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
                mode={dialog.mode}
                category={dialog.category}
                stations={stations}
            />

            <DeleteCategoryDialog
                open={deleteTarget !== null}
                name={deleteTarget?.name ?? null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                onConfirm={confirmDelete}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Menu', href: productsIndex() },
        { title: 'Categories', href: index() },
    ],
};
