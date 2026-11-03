import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { options } from '@/routes/inventory/ingredients';
import type { IngredientOptions } from '@/types/inventory';

/** Active ingredients and every unit, for the pickers in the recipe editor, waste modal and purchase forms. */
export function useIngredientOptions(enabled = true) {
    return useQuery({
        queryKey: ['inventory', 'ingredient-options'],
        queryFn: () => api<IngredientOptions>(options.url()),
        enabled,
        staleTime: 60_000,
    });
}

/** Units an ingredient can be measured in: its own kind (grams for beans) plus count units like bottle. */
export function unitsFor(options: IngredientOptions | undefined, ingredientId: number | string | null) {
    if (!options || !ingredientId) {
        return [];
    }

    const ingredient = options.ingredients.find((i) => i.id === Number(ingredientId));

    if (!ingredient) {
        return [];
    }

    return options.units.filter((u) => u.type === ingredient.base_unit_type || u.type === 'count' || u.id === ingredient.base_unit_id);
}
