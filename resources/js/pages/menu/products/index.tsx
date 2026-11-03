import { Link, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/can';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCan } from '@/hooks/use-can';
import { columnClassNames, getColumns } from '@/pages/menu/products/columns';
import ProductEditDialog from '@/pages/menu/products/edit-dialog';
import ProductFormDialog from '@/pages/menu/products/form-dialog';
import { index } from '@/routes/menu/products';
import type { AttachableGroup, Option, ProductDetail, ProductRow } from '@/types/menu';

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type Filters = {
    search: string;
    category_id?: string | null;
    status?: string | null;
    sort?: string | null;
    direction?: 'asc' | 'desc' | null;
};

type Props = {
    // Optional on the server: undefined until the person asks for it.
    products?: Paginated<ProductRow>;
    categories: Option[];
    stations?: Option[];
    // Set while the edit dialog is open (?edit=ID), otherwise null.
    editing: ProductDetail | null;
    modifierGroups: AttachableGroup[];
    filters: Filters;
};

// Partial reloads: only these props are requested, which is also what makes
// the optional `products` prop come back.
const LIST = ['products', 'filters'];
const ALL = 'all';

export default function Index({ products, categories, editing, modifierGroups, stations, filters }: Props) {
    const { can } = useCan();

    const canUpdate = can('menu.update');
    const canAvailability = can('menu.availability');

    const [search, setSearch] = useState(filters.search ?? '');
    const [creating, setCreating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Sorting state comes from the server (query string), so it survives reloads and pagination.
    const sorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction === 'desc' }] : []),
        [filters.sort, filters.direction],
    );

    /**
     * One place that builds the URL. `edit` rides along while the dialog is open,
     * so a list reload never closes it and a save (back()) reopens it with fresh data.
     */
    function visit(next: Partial<Filters> = {}, options: { edit?: number | null; only?: string[] } = {}) {
        const merged = { ...filters, ...next };
        const edit = options.edit === undefined ? editing?.id : options.edit;

        router.get(
            index.url(),
            {
                search: merged.search || undefined,
                category_id: merged.category_id || undefined,
                status: merged.status || undefined,
                sort: merged.sort ?? undefined,
                direction: merged.direction ?? undefined,
                edit: edit ?? undefined,
            },
            {
                only: options.only ?? LIST,
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    }

    function loadProducts() {
        visit();
    }

    // Once data has been loaded, keep it loaded. A delete or availability toggle
    // redirects back with a full visit that drops the optional prop, so fetch it again.
    useEffect(() => {
        if (products) {
            setHasLoaded(true);
        } else if (hasLoaded) {
            loadProducts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [products]);

    function openEdit(product: ProductRow) {
        visit({}, { edit: product.id, only: ['editing', 'modifierGroups'] });
    }

    function closeEdit() {
        visit({}, { edit: null, only: ['editing', 'modifierGroups'] });
    }

    // Memoized so TanStack Table doesn't rebuild columns on every render.
    const columns = useMemo(
        () => getColumns({ canAvailability, canUpdate, onEdit: openEdit }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [canAvailability, canUpdate, filters],
    );

    function submitSearch(event: FormEvent) {
        event.preventDefault();
        visit({ search });
    }

    function handleSortingChange(next: SortingState) {
        const [first] = next;
        visit({ sort: first?.id ?? null, direction: first ? (first.desc ? 'desc' : 'asc') : null });
    }

    return (
        <>
            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Products</h1>
                        {products && <p className="text-muted-foreground text-sm">{products.total} total</p>}
                    </div>

                    <Can permission="menu.create">
                        <Button onClick={() => setCreating(true)}>Add product</Button>
                    </Can>
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
                </div>

                <DataTable
                    columns={columns}
                    data={products?.data ?? []}
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

                {products && products.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-muted-foreground text-sm">
                            Page {products.current_page} of {products.last_page}
                        </p>
                        <div className="flex gap-2">
                            {products.prev_page_url ? (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={products.prev_page_url} only={LIST} preserveState preserveScroll>
                                        Previous
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" disabled>
                                    Previous
                                </Button>
                            )}
                            {products.next_page_url ? (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={products.next_page_url} only={LIST} preserveState preserveScroll>
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

            <ProductFormDialog open={creating} onOpenChange={setCreating} categories={categories} />

            <ProductEditDialog product={editing ?? null} categories={categories} stations={stations ?? []} modifierGroups={modifierGroups ?? []} onClose={closeEdit} />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Menu', href: index() },
        { title: 'Products', href: index() },
    ],
};