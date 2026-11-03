import { Head, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/can';
import { DataTable } from '@/components/data-table';
import { Pager } from '@/components/pager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cleanQuery } from '@/lib/inventory';
import AdjustDialog from '@/pages/inventory/ingredients/adjust-dialog';
import CategoriesDialog from '@/pages/inventory/ingredients/categories-dialog';
import { columnClassNames, getColumns } from '@/pages/inventory/ingredients/columns';
import IngredientFormDialog from '@/pages/inventory/ingredients/form-dialog';
import WasteDialog from '@/pages/inventory/waste/waste-dialog';
import { index } from '@/routes/inventory/ingredients';
import type { IngredientCategory, IngredientRow, Unit } from '@/types/inventory';
import type { Paginated } from '@/types/menu';

type Filters = {
    search: string;
    filter: string;
    category: number | null;
    sort?: string | null;
    direction?: 'asc' | 'desc' | null;
};

type Props = {
    // Optional on the server: undefined until the person asks for it.
    ingredients?: Paginated<IngredientRow>;
    categories: IngredientCategory[];
    units: Unit[];
    filters: Filters;
};

const ALL = 'all';

// Partial reloads: only these props are requested, which is also what makes
// the optional `ingredients` prop come back.
const ONLY = ['ingredients', 'filters'];

export default function IngredientsIndex({ ingredients, categories, units, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<{ open: boolean; ingredient?: IngredientRow }>({ open: false });
    const [adjusting, setAdjusting] = useState<IngredientRow | undefined>();
    const [wasting, setWasting] = useState<IngredientRow | undefined>();
    const [categoriesOpen, setCategoriesOpen] = useState(false);

    // The last page of ingredients that was loaded. Shown while a refresh is on its way,
    // so the table doesn't flash back to the "Load ingredients" state after a save.
    const [loaded, setLoaded] = useState<Paginated<IngredientRow> | undefined>(ingredients);
    const data = ingredients ?? loaded;

    // Memoized so TanStack Table doesn't rebuild columns on every render.
    const columns = useMemo(
        () =>
            getColumns({
                onEdit: (ingredient) => setForm({ open: true, ingredient }),
                onAdjust: setAdjusting,
                onWaste: setWasting,
            }),
        [],
    );

    // Sorting state comes from the server (query string), so it survives reloads and pagination.
    const sorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction === 'desc' }] : []),
        [filters.sort, filters.direction],
    );

    // A new search, filter or sort. The page number resets to 1.
    function visit(next: Partial<Filters> = {}) {
        const merged = { ...filters, ...next };

        router.get(
            index.url(),
            cleanQuery({
                search: merged.search,
                filter: merged.filter,
                category: merged.category,
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

    // Asks the server for the data of the page we are already on (same search, sort and page number).
    function loadIngredients() {
        router.reload({
            only: ONLY,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    // Once data has been loaded, keep it loaded. A save in a dialog redirects back here with a
    // full visit that drops the optional prop, so fetch it again.
    useEffect(() => {
        if (ingredients) {
            setLoaded(ingredients);
        } else if (loaded) {
            loadIngredients();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ingredients]);

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
            <Head title="Ingredients" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Ingredients</h1>
                        {data && <p className="text-muted-foreground text-sm">{data.total} total</p>}
                    </div>

                    <Can permission="inventory.adjust">
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
                                Categories
                            </Button>
                            <Button onClick={() => setForm({ open: true })}>Add ingredient</Button>
                        </div>
                    </Can>
                </div>

                <div className="flex flex-wrap gap-2">
                    <form onSubmit={submitSearch} className="flex min-w-64 max-w-sm flex-1 gap-2">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or SKU" aria-label="Search ingredients" />
                        <Button type="submit" variant="outline" disabled={loading}>
                            Search
                        </Button>
                    </form>

                    <Select value={filters.category ? String(filters.category) : ALL} onValueChange={(value) => visit({ category: value === ALL ? null : Number(value) })}>
                        <SelectTrigger className="w-44" aria-label="Category">
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

                    <Select value={filters.filter || ALL} onValueChange={(value) => visit({ filter: value === ALL ? '' : value })}>
                        <SelectTrigger className="w-44" aria-label="Stock filter">
                            <SelectValue placeholder="Stock" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All active</SelectItem>
                            <SelectItem value="low">Low stock</SelectItem>
                            <SelectItem value="negative">Negative stock</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
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
                            'No ingredients found.'
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm">Ingredients aren&apos;t loaded yet.</p>
                                <Button onClick={loadIngredients} disabled={loading}>
                                    {loading ? 'Loading…' : 'Load ingredients'}
                                </Button>
                            </div>
                        )
                    }
                />

                {data && <Pager currentPage={data.current_page} lastPage={data.last_page} prevUrl={data.prev_page_url} nextUrl={data.next_page_url} only={ONLY} />}
            </div>

            <IngredientFormDialog
                open={form.open}
                ingredient={form.ingredient}
                categories={categories}
                units={units}
                onOpenChange={(open) => setForm((current) => ({ ...current, open }))}
            />
            <AdjustDialog open={Boolean(adjusting)} ingredient={adjusting} onOpenChange={(open) => !open && setAdjusting(undefined)} />
            <WasteDialog open={Boolean(wasting)} ingredientId={wasting?.id} onOpenChange={(open) => !open && setWasting(undefined)} />
            <CategoriesDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} categories={categories} />
        </>
    );
}

IngredientsIndex.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: index() },
        { title: 'Ingredients', href: index() },
    ],
};