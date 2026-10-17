import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/can';
import { DataTable } from '@/components/data-table';
import { Pager } from '@/components/inventory/pager';
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
import type { Paginated } from '@/types/menu';
import type { IngredientCategory, IngredientRow, Unit } from '@/types/inventory';

type Filters = { search: string; filter: string; category: number | null };

type Props = {
    ingredients: Paginated<IngredientRow>;
    categories: IngredientCategory[];
    units: Unit[];
    filters: Filters;
};

const ALL = 'all';

export default function IngredientsIndex({ ingredients, categories, units, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<{ open: boolean; ingredient?: IngredientRow }>({ open: false });
    const [adjusting, setAdjusting] = useState<IngredientRow | undefined>();
    const [wasting, setWasting] = useState<IngredientRow | undefined>();
    const [categoriesOpen, setCategoriesOpen] = useState(false);

    function visit(next: Partial<Filters> = {}) {
        const merged = { ...filters, ...next };

        router.get(index.url(), cleanQuery({ search: merged.search, filter: merged.filter, category: merged.category }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    function submitSearch(event: FormEvent) {
        event.preventDefault();
        visit({ search });
    }

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

    return (
        <>
            <Head title="Ingredients" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Ingredients</h1>
                        <p className="text-muted-foreground text-sm">{ingredients.total} total</p>
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
                    data={ingredients.data}
                    sorting={[]}
                    onSortingChange={() => {}}
                    columnClassNames={columnClassNames}
                    emptyContent="No ingredients found."
                />

                <Pager currentPage={ingredients.current_page} lastPage={ingredients.last_page} prevUrl={ingredients.prev_page_url} nextUrl={ingredients.next_page_url} />
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
