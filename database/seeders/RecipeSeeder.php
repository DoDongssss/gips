<?php

namespace Database\Seeders;

use App\Enums\ModifierAction;
use App\Models\Ingredient;
use App\Models\ModifierRecipeItem;
use App\Models\Recipe;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Links products, sizes and modifiers to ingredients. Run after MenuSeeder and InventorySeeder.
 *
 * How a recipe is chosen at sale time:
 *   - A size with its own recipe uses it.
 *   - A size with none falls back to the product recipe (the default size here).
 * Safe to re-run: a product, size or modifier that already has a recipe is left alone, so edits made in the app survive.
 * Items are [ingredient, quantity in the ingredient's base unit].
 */
class RecipeSeeder extends Seeder
{
    public function run(): void
    {
        $ingredient = Ingredient::pluck('id', 'name');
        $baseUnit = Ingredient::pluck('base_unit_id', 'name');

        foreach ($this->productRecipes() as $slug => $definition) {
            $product = DB::table('products')->where('slug', $slug)->first();

            if (! $product) {
                $this->command?->warn("Product '{$slug}' not found, skipped. Run MenuSeeder first.");

                continue;
            }

            $this->makeRecipe($product->id, null, $definition['default'], $ingredient, $baseUnit);

            foreach ($definition['sizes'] ?? [] as $size => $items) {
                $variantId = DB::table('product_variants')->where('product_id', $product->id)->where('name', $size)->value('id');

                if ($variantId) {
                    $this->makeRecipe($product->id, $variantId, $items, $ingredient, $baseUnit);
                }
            }
        }

        foreach ($this->modifierRecipes() as $modifierName => $items) {
            $modifierId = DB::table('modifiers')->where('name', $modifierName)->value('id');

            if (! $modifierId || ModifierRecipeItem::where('modifier_id', $modifierId)->exists()) {
                continue;
            }

            foreach ($items as [$action, $name, $qty, $replaces]) {
                ModifierRecipeItem::create([
                    'modifier_id' => $modifierId, 'ingredient_id' => $ingredient[$name], 'quantity' => $qty,
                    'unit_id' => $baseUnit[$name], 'action' => $action,
                    'replaces_ingredient_id' => $replaces ? $ingredient[$replaces] : null,
                ]);
            }
        }
    }

    /** @param array<int, array{0: string, 1: int|float}> $items */
    private function makeRecipe(int $productId, ?int $variantId, array $items, $ingredient, $baseUnit): void
    {
        if (Recipe::where('product_id', $productId)->where('product_variant_id', $variantId)->exists()) {
            return;
        }

        $recipe = Recipe::create(['product_id' => $productId, 'product_variant_id' => $variantId, 'yield_quantity' => 1]);

        foreach ($items as [$name, $qty]) {
            $recipe->items()->create(['ingredient_id' => $ingredient[$name], 'quantity' => $qty, 'unit_id' => $baseUnit[$name]]);
        }
    }

    /**
     * Keyed by product slug. 'default' is the product recipe (the default size);
     * 'sizes' holds the recipes for the other sizes, keyed by size name.
     *
     * @return array<string, array<string, mixed>>
     */
    private function productRecipes(): array
    {
        return [
            'espresso' => ['default' => [['Espresso beans', 18], ['Hot cup 8oz', 1], ['Hot lid', 1]]],

            'hot-americano' => [
                'default' => [['Espresso beans', 18], ['Hot cup 12oz', 1], ['Hot lid', 1]],
                'sizes' => ['Small 8oz' => [['Espresso beans', 18], ['Hot cup 8oz', 1], ['Hot lid', 1]]],
            ],
            'hot-latte' => [
                'default' => [['Espresso beans', 18], ['Whole milk', 200], ['Hot cup 12oz', 1], ['Hot lid', 1]],
                'sizes' => ['Small 8oz' => [['Espresso beans', 18], ['Whole milk', 140], ['Hot cup 8oz', 1], ['Hot lid', 1]]],
            ],
            'cappuccino' => [
                'default' => [['Espresso beans', 18], ['Whole milk', 150], ['Hot cup 12oz', 1], ['Hot lid', 1]],
                'sizes' => ['Small 8oz' => [['Espresso beans', 18], ['Whole milk', 110], ['Hot cup 8oz', 1], ['Hot lid', 1]]],
            ],

            'iced-americano' => [
                'default' => [['Espresso beans', 18], ['Ice', 150], ['Cold cup 16oz', 1], ['Cold lid', 1]],
                'sizes' => ['Large 22oz' => [['Espresso beans', 27], ['Ice', 200], ['Cold cup 22oz', 1], ['Cold lid', 1]]],
            ],
            'iced-latte' => [
                'default' => [['Espresso beans', 18], ['Whole milk', 180], ['Ice', 120], ['Cold cup 16oz', 1], ['Cold lid', 1]],
                'sizes' => ['Large 22oz' => [['Espresso beans', 27], ['Whole milk', 240], ['Ice', 160], ['Cold cup 22oz', 1], ['Cold lid', 1]]],
            ],
            'iced-caramel-macchiato' => [
                'default' => [['Espresso beans', 18], ['Whole milk', 170], ['Caramel syrup', 20], ['Ice', 120], ['Cold cup 16oz', 1], ['Cold lid', 1]],
                'sizes' => ['Large 22oz' => [['Espresso beans', 27], ['Whole milk', 230], ['Caramel syrup', 30], ['Ice', 160], ['Cold cup 22oz', 1], ['Cold lid', 1]]],
            ],

            'iced-matcha-latte' => [
                'default' => [['Matcha powder', 6], ['Whole milk', 200], ['Ice', 120], ['Cold cup 16oz', 1], ['Cold lid', 1]],
                'sizes' => ['Large 22oz' => [['Matcha powder', 9], ['Whole milk', 270], ['Ice', 160], ['Cold cup 22oz', 1], ['Cold lid', 1]]],
            ],
            'iced-chocolate' => [
                'default' => [['Chocolate sauce', 40], ['Whole milk', 200], ['Ice', 120], ['Cold cup 16oz', 1], ['Cold lid', 1]],
                'sizes' => ['Large 22oz' => [['Chocolate sauce', 55], ['Whole milk', 270], ['Ice', 160], ['Cold cup 22oz', 1], ['Cold lid', 1]]],
            ],

            'butter-croissant' => ['default' => [['Butter croissant', 1]]],
            'chocolate-muffin' => ['default' => [['Chocolate muffin', 1]]],
            'ham-cheese-sandwich' => ['default' => [['Sandwich bread', 2], ['Ham slice', 2], ['Cheese slice', 1]]],
        ];
    }

    /**
     * Keyed by modifier name. Each item: [action, ingredient, quantity, replaced ingredient (replace only)].
     *   add     uses extra stock
     *   remove  takes out up to this quantity of the recipe's ingredient
     *   replace takes out the replaced ingredient entirely and uses this one instead
     * Quantities are fixed, so "Oat milk" uses 180 ml on every size.
     *
     * @return array<string, array<int, array{0: ModifierAction, 1: string, 2: int|float, 3: string|null}>>
     */
    private function modifierRecipes(): array
    {
        return [
            'Oat milk' => [[ModifierAction::Replace, 'Oat milk', 180, 'Whole milk']],
            'Extra shot' => [[ModifierAction::Add, 'Espresso beans', 18, null]],
            'Vanilla syrup' => [[ModifierAction::Add, 'Vanilla syrup', 15, null]],
            'Caramel syrup' => [[ModifierAction::Add, 'Caramel syrup', 15, null]],
            'Hazelnut syrup' => [[ModifierAction::Add, 'Hazelnut syrup', 15, null]],
            'Less ice' => [[ModifierAction::Remove, 'Ice', 50, null]],
            'No ice' => [[ModifierAction::Remove, 'Ice', 150, null]],
        ];
    }
}
