import { useForm } from '@inertiajs/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { IngredientSelect, UnitSelect } from '@/components/inventory/pickers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { unitsFor, useIngredientOptions } from '@/hooks/use-ingredient-options';
import { useCan } from '@/hooks/use-can';
import { api } from '@/lib/api';
import { show, update } from '@/routes/recipes';
import type { ProductDetail } from '@/types/menu';

type Line = { ingredient_id: string; quantity: string; unit_id: string };
type Block = { variant_id: number | null; title: string; yield_quantity: string; items: Line[] };

type RecipeResponse = {
    product: { yield_quantity: string; items: { ingredient_id: number; quantity: string; unit_id: number }[] };
    variants: { id: number; name: string; yield_quantity: string; items: { ingredient_id: number; quantity: string; unit_id: number }[] }[];
};

const toLines = (items: { ingredient_id: number; quantity: string; unit_id: number }[]): Line[] =>
    items.map((item) => ({ ingredient_id: String(item.ingredient_id), quantity: String(Number(item.quantity)), unit_id: String(item.unit_id) }));

/**
 * What one sale of this product uses up. A size without its own recipe falls back to the
 * product recipe, so most products only need the top block.
 */
export function RecipeTab({ product }: { product: ProductDetail }) {
    const { can } = useCan();
    const canEdit = can('recipe.manage');
    const queryClient = useQueryClient();

    const { data: options } = useIngredientOptions();
    const recipe = useQuery({
        queryKey: ['recipe', product.id],
        queryFn: () => api<RecipeResponse>(show.url(product.id)),
        staleTime: 0,
    });

    const form = useForm<{ recipes: Block[] }>({ recipes: [] });
    const errors = form.errors as Record<string, string>;

    useEffect(() => {
        if (!recipe.data) {
            return;
        }

        form.setData('recipes', [
            { variant_id: null, title: 'Whole product', yield_quantity: String(Number(recipe.data.product.yield_quantity)), items: toLines(recipe.data.product.items) },
            ...recipe.data.variants.map((variant) => ({
                variant_id: variant.id,
                title: `Size: ${variant.name}`,
                yield_quantity: String(Number(variant.yield_quantity)),
                items: toLines(variant.items),
            })),
        ]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recipe.data]);

    const set = (blocks: Block[]) => form.setData('recipes', blocks);
    const patchBlock = (b: number, change: Partial<Block>) => set(form.data.recipes.map((block, i) => (i === b ? { ...block, ...change } : block)));
    const patchLine = (b: number, l: number, change: Partial<Line>) =>
        patchBlock(b, { items: form.data.recipes[b].items.map((line, i) => (i === l ? { ...line, ...change } : line)) });

    function pickIngredient(b: number, l: number, ingredientId: string) {
        const ingredient = options?.ingredients.find((i) => String(i.id) === ingredientId);

        // New lines start in the ingredient's base unit, which is almost always what a recipe uses.
        patchLine(b, l, { ingredient_id: ingredientId, unit_id: ingredient ? String(ingredient.base_unit_id) : '' });
    }

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            recipes: data.recipes.map((block) => ({
                product_variant_id: block.variant_id,
                yield_quantity: block.yield_quantity.trim() === '' ? 1 : block.yield_quantity,
                // Rows left half-filled are dropped, so an empty block clears that recipe.
                items: block.items
                    .filter((line) => line.ingredient_id && line.quantity.trim() !== '' && line.unit_id)
                    .map((line) => ({ ingredient_id: Number(line.ingredient_id), quantity: line.quantity, unit_id: Number(line.unit_id) })),
            })),
        }));

        form.put(update.url(product.id), {
            preserveScroll: true,
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipe', product.id] }),
        });
    }

    if (recipe.isLoading || !options) {
        return <p className="text-muted-foreground py-6 text-sm">Loading recipe…</p>;
    }

    if (recipe.isError) {
        return <p className="text-destructive py-6 text-sm">The recipe could not be loaded.</p>;
    }

    // The options endpoint must return { ingredients, units }. An older backend returns a different shape.
    if (!Array.isArray(options.ingredients) || !Array.isArray(options.units)) {
        return <p className="text-destructive py-6 text-sm">The ingredient list came back in an unexpected format. Update IngredientController::options() from the latest backend zip.</p>;
    }

    return (
        <form onSubmit={submit} className="space-y-5">
            <p className="text-muted-foreground text-sm">
                Each sale deducts these amounts from stock once the order is paid. Leave a size empty to use the whole-product recipe.
            </p>

            {form.data.recipes.map((block, b) => {
                const isProduct = block.variant_id === null;

                return (
                    <section key={block.variant_id ?? 'product'} className="space-y-3 rounded-lg border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-medium">{block.title}</h3>
                            {!isProduct && canEdit && block.items.length === 0 && form.data.recipes[0].items.length > 0 && (
                                <Button type="button" size="sm" variant="outline" onClick={() => patchBlock(b, { items: form.data.recipes[0].items.map((line) => ({ ...line })) })}>
                                    Copy from whole product
                                </Button>
                            )}
                        </div>

                        {block.items.length === 0 && (
                            <p className="text-muted-foreground text-sm">{isProduct ? 'No ingredients yet. This product deducts nothing.' : 'Uses the whole-product recipe.'}</p>
                        )}

                        <div className="space-y-2">
                            {block.items.map((line, l) => (
                                <div key={l} className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <IngredientSelect
                                            value={line.ingredient_id}
                                            onChange={(value) => pickIngredient(b, l, value)}
                                            ingredients={options.ingredients}
                                            label="Ingredient"
                                            disabled={!canEdit}
                                        />
                                        <Input
                                            className="w-28"
                                            inputMode="decimal"
                                            placeholder="Amount"
                                            aria-label="Amount"
                                            disabled={!canEdit}
                                            value={line.quantity}
                                            onChange={(e) => patchLine(b, l, { quantity: e.target.value })}
                                        />
                                        <UnitSelect value={line.unit_id} onChange={(value) => patchLine(b, l, { unit_id: value })} units={unitsFor(options, line.ingredient_id)} disabled={!canEdit} />
                                        {canEdit && (
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                aria-label="Remove ingredient"
                                                onClick={() => patchBlock(b, { items: block.items.filter((_, i) => i !== l) })}
                                            >
                                                <Trash2 className="text-destructive size-4" />
                                            </Button>
                                        )}
                                    </div>
                                    {(errors[`recipes.${b}.items.${l}.unit_id`] ?? errors[`recipes.${b}.items.${l}.quantity`] ?? errors[`recipes.${b}.items.${l}.ingredient_id`]) && (
                                        <p className="text-destructive text-sm">
                                            {errors[`recipes.${b}.items.${l}.unit_id`] ?? errors[`recipes.${b}.items.${l}.quantity`] ?? errors[`recipes.${b}.items.${l}.ingredient_id`]}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {canEdit && (
                            <div className="flex flex-wrap items-center gap-3">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => patchBlock(b, { items: [...block.items, { ingredient_id: '', quantity: '', unit_id: '' }] })}
                                >
                                    <Plus className="size-3.5" /> Add ingredient
                                </Button>

                                {block.items.length > 0 && (
                                    <label className="text-muted-foreground flex items-center gap-2 text-xs">
                                        Makes
                                        <Input
                                            className="h-8 w-16"
                                            inputMode="decimal"
                                            aria-label="Servings this recipe makes"
                                            value={block.yield_quantity}
                                            onChange={(e) => patchBlock(b, { yield_quantity: e.target.value })}
                                        />
                                        serving(s)
                                    </label>
                                )}
                            </div>
                        )}
                        {errors[`recipes.${b}.product_variant_id`] && <p className="text-destructive text-sm">{errors[`recipes.${b}.product_variant_id`]}</p>}
                    </section>
                );
            })}

            {canEdit && (
                <Button type="submit" disabled={form.processing}>
                    {form.processing ? 'Saving…' : 'Save recipe'}
                </Button>
            )}
        </form>
    );
}
