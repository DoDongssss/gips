import { Head, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/shared/can';
import { DataTable } from '@/components/shared/data-table';
import { Pager } from '@/components/shared/pager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCan } from '@/hooks/shared/use-can';
import { columnClassNames, getColumns } from '@/pages/menu/products/columns';
import { DeleteProductDialog } from '@/pages/menu/products/delete-product-dialog';
import ProductEditDialog from '@/pages/menu/products/edit-dialog';
import ProductFormDialog from '@/pages/menu/products/form-dialog';
import { index } from '@/routes/menu/products';
import type { AttachableGroup, Option, Paginated, ProductDetail, ProductRow } from '@/types/menu';

type Filters = {
    search: string;
    category_id?: string | null;
    station_id?: string | null;
    status?: string | null;
    recipe?: string | null;
    has_image?: string | null;
    modifier_group?: string | null;
    trashed?: boolean;
    sort?: string | null;
    direction?: 'asc' | 'desc' | null;
};

type Props = {
    products?: Paginated<ProductRow>;
    categories: Option[];
    modifierGroupOptions?: Option[];
    stations: Option[];
    editing: ProductDetail | null;
    modifierGroups: AttachableGroup[];
    dialogStations?: Option[];
    filters: Filters;
};

const LIST = ['products', 'filters'];
const EDIT = ['editing', 'modifierGroups', 'dialogStations'];
const ALL = 'all';

export default function Index({ products, categories, modifierGroupOptions = [], stations, editing, modifierGroups, dialogStations, filters }: Props) {
    const { can } = useCan();
    const canUpdate = can('menu.update');
    const canCreate = can('menu.create');
    const canDelete = can('menu.delete');
    const canAvailability = can('menu.availability');

    const [search, setSearch] = useState(filters.search ?? '');
    const [creating, setCreating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
    const [bulkCategory, setBulkCategory] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const sorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction === 'desc' }] : []),
        [filters.sort, filters.direction],
    );

    const canReorder = Boolean(filters.category_id) && !filters.trashed && canUpdate;
    const rows = products?.data ?? [];

    function queryParams(next: Partial<Filters> = {}, edit?: number | null) {
        const merged = { ...filters, ...next };

        return {
            search: merged.search || undefined,
            category_id: merged.category_id || undefined,
            station_id: merged.station_id || undefined,
            status: merged.status || undefined,
            recipe: merged.recipe || undefined,
            has_image: merged.has_image || undefined,
            modifier_group: merged.modifier_group || undefined,
            trashed: merged.trashed ? '1' : undefined,
            sort: merged.sort ?? undefined,
            direction: merged.direction ?? undefined,
            edit: edit === undefined ? editing?.id : (edit ?? undefined),
        };
    }

    function visit(next: Partial<Filters> = {}, options: { edit?: number | null; only?: string[] } = {}) {
        router.get(index.url(), queryParams(next, options.edit), {
            only: options.only ?? LIST,
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    function loadProducts() {
        visit();
    }

    useEffect(() => {
        if (products) {
            setHasLoaded(true);
            setSelectedIds(new Set());
        } else if (hasLoaded) {
            loadProducts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [products]);

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

    function openEdit(product: ProductRow) {
        router.get(index.url(), queryParams({}, product.id), {
            only: EDIT,
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    function closeEdit() {
        visit({}, { edit: null, only: EDIT });
    }

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
            category_id: null,
            station_id: null,
            status: null,
            recipe: null,
            has_image: null,
            trashed: false,
        });
    }

    const filtersActive =
        Boolean(filters.search) ||
        Boolean(filters.category_id) ||
        Boolean(filters.station_id) ||
        Boolean(filters.status) ||
        Boolean(filters.recipe) ||
        Boolean(filters.has_image) ||
        Boolean(filters.modifier_group) ||
        Boolean(filters.trashed);

    const exportUrl = `/menu/products/export?${new URLSearchParams(
        Object.entries(queryParams()).filter(([, v]) => v !== undefined && v !== null) as [string, string][],
    )}`;

    function duplicateProduct(product: ProductRow) {
        router.post(`/menu/products/${product.id}/duplicate`, {}, { preserveScroll: true, onSuccess: () => visit() });
    }

    function moveProduct(product: ProductRow, direction: 'up' | 'down') {
        router.post(`/menu/products/${product.id}/move`, { direction }, { preserveScroll: true, only: LIST });
    }

    function restoreProduct(product: ProductRow) {
        router.post(`/menu/products/${product.id}/restore`, {}, { preserveScroll: true, only: LIST });
    }

    function confirmDelete() {
        if (!deleteTarget) {
            return;
        }

        router.delete(`/menu/products/${deleteTarget.id}`, { preserveScroll: true, onFinish: () => setDeleteTarget(null) });
    }

    function bulk(action: string) {
        const ids = [...selectedIds];

        if (ids.length === 0) {
            return;
        }

        router.post(
            '/menu/products/bulk',
            {
                action,
                ids,
                category_id: action === 'move_category' ? bulkCategory : undefined,
            },
            { preserveScroll: true, only: LIST, onSuccess: () => setSelectedIds(new Set()) },
        );
    }

    const columns = useMemo(
        () =>
            getColumns({
                canAvailability,
                canUpdate,
                canCreate,
                canDelete,
                canReorder,
                trashed: Boolean(filters.trashed),
                onEdit: openEdit,
                onDelete: setDeleteTarget,
                onDuplicate: duplicateProduct,
                onMove: moveProduct,
                onRestore: restoreProduct,
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
        [canAvailability, canUpdate, canCreate, canDelete, canReorder, filters.trashed, selectedIds, rows],
    );

    return (
        <>
            <Head title="Products" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">{filters.trashed ? 'Deleted products' : 'Products'}</h1>
                        {products && <p className="text-muted-foreground text-sm">{products.total} total</p>}
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
                            {!filters.trashed && <Button onClick={() => setCreating(true)}>Add product</Button>}
                        </Can>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <form onSubmit={submitSearch} className="flex min-w-64 max-w-sm flex-1 gap-2">
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or SKU" />
                        <Button type="submit" variant="outline" disabled={loading}>
                            Search
                        </Button>
                    </form>

                    <Select value={filters.category_id ?? ALL} onValueChange={(value) => visit({ category_id: value === ALL ? null : value })}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All categories</SelectItem>
                            {categories.map((category) => (
                                <SelectItem key={category.id} value={String(category.id)}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filters.station_id ?? ALL} onValueChange={(value) => visit({ station_id: value === ALL ? null : value })}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="Station" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All stations</SelectItem>
                            <SelectItem value="category">Category default</SelectItem>
                            {stations.map((station) => (
                                <SelectItem key={station.id} value={String(station.id)}>
                                    {station.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filters.status ?? ALL} onValueChange={(value) => visit({ status: value === ALL ? null : value })}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Hidden</SelectItem>
                            <SelectItem value="sold_out">Sold out</SelectItem>
                        </SelectContent>
                    </Select>

                    {modifierGroupOptions.length > 0 && (
                        <Select value={filters.modifier_group ?? ALL} onValueChange={(value) => visit({ modifier_group: value === ALL ? null : value })}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="Add-on group" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All add-on groups</SelectItem>
                                {modifierGroupOptions.map((group) => (
                                    <SelectItem key={group.id} value={String(group.id)}>
                                        {group.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Select value={filters.recipe ?? ALL} onValueChange={(value) => visit({ recipe: value === ALL ? null : value })}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Recipe" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Any recipe</SelectItem>
                            <SelectItem value="has_recipe">Has recipe</SelectItem>
                            <SelectItem value="no_recipe">No recipe</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filters.has_image ?? ALL} onValueChange={(value) => visit({ has_image: value === ALL ? null : value })}>
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="Image" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Any image</SelectItem>
                            <SelectItem value="1">Has image</SelectItem>
                            <SelectItem value="0">No image</SelectItem>
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

                {canReorder && (
                    <p className="text-muted-foreground text-xs">Showing one category — use the arrows to change menu order within it.</p>
                )}

                {selectedIds.size > 0 && canUpdate && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
                        <span className="text-sm font-medium">{selectedIds.size} selected</span>
                        <Button type="button" size="sm" variant="outline" onClick={() => bulk('available')}>
                            Mark available
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => bulk('sold_out')}>
                            Mark sold out
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => bulk('show')}>
                            Show on menu
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => bulk('hide')}>
                            Hide
                        </Button>
                        <Select value={bulkCategory} onValueChange={setBulkCategory}>
                            <SelectTrigger className="h-8 w-44">
                                <SelectValue placeholder="Move to category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((category) => (
                                    <SelectItem key={category.id} value={String(category.id)}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button type="button" size="sm" variant="outline" disabled={!bulkCategory} onClick={() => bulk('move_category')}>
                            Move
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
                        products ? (
                            'No products found.'
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm">Products aren&apos;t loaded yet.</p>
                                <Button onClick={loadProducts} disabled={loading}>
                                    {loading ? 'Loading…' : 'Load products'}
                                </Button>
                            </div>
                        )
                    }
                />

                {products && (
                    <Pager
                        currentPage={products.current_page}
                        lastPage={products.last_page}
                        prevUrl={products.prev_page_url}
                        nextUrl={products.next_page_url}
                        only={LIST}
                    />
                )}
            </div>

            <ProductFormDialog open={creating} onOpenChange={setCreating} categories={categories} />

            <ProductEditDialog
                product={editing ?? null}
                categories={categories}
                stations={dialogStations ?? stations}
                modifierGroups={modifierGroups ?? []}
                onClose={closeEdit}
            />

            <DeleteProductDialog
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
        { title: 'Menu', href: index() },
        { title: 'Products', href: index() },
    ],
};
