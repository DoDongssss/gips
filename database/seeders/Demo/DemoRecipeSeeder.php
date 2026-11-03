<?php

namespace Database\Seeders\Demo;

use App\Enums\ModifierAction;
use App\Models\Ingredient;
use App\Models\ModifierRecipeItem;
use App\Models\Recipe;
use Database\Seeders\Demo\Data\MenuCatalog;
use Database\Seeders\Demo\Data\ModifierCatalog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Links products, sizes and modifiers to ingredients. Runs after DemoMenuSeeder and DemoInventorySeeder.
 *
 * How a recipe is chosen at sale time:
 *   - A size with its own recipe uses it.
 *   - A size with none falls back to the product recipe (the default size).
 *
 * Safe to re-run: a product, size or modifier that already has a recipe is left alone, so edits made
 * in the app survive. An unknown ingredient name stops the run with a clear error instead of seeding half a recipe.
 */
class DemoRecipeSeeder extends Seeder
{
    /** @var array<string, int> */
    private array $ingredientIds = [];

    /** @var array<string, int> */
    private array $baseUnitIds = [];

    public function run(): void
    {
        $this->ingredientIds = Ingredient::pluck('id', 'name')->all();
        $this->baseUnitIds = Ingredient::pluck('base_unit_id', 'name')->all();

        DB::transaction(function () {
            $this->seedProductRecipes();
            $this->seedModifierRecipes();
        });
    }

    private function seedProductRecipes(): void
    {
        foreach (MenuCatalog::categories() as $category) {
            foreach ($category['products'] as $product) {
                $slug = Str::slug($product['name']);
                $productId = DB::table('products')->where('slug', $slug)->value('id');

                if (! $productId) {
                    $this->command?->warn("Product '{$slug}' not found, skipped. Run DemoMenuSeeder first.");

                    continue;
                }

                $this->makeRecipe($productId, null, $product['recipe']);

                foreach ($product['sizes'] as $size => $items) {
                    $variantId = DB::table('product_variants')->where('product_id', $productId)->where('name', $size)->value('id');

                    if ($variantId) {
                        $this->makeRecipe($productId, $variantId, $items);
                    }
                }
            }
        }
    }

    private function seedModifierRecipes(): void
    {
        foreach (ModifierCatalog::groups() as $group) {
            $groupId = DB::table('modifier_groups')->where('name', $group['name'])->value('id');

            foreach ($group['modifiers'] as [$name, , , $effects]) {
                if (! $groupId || ! $effects) {
                    continue;
                }

                $modifierId = DB::table('modifiers')->where('modifier_group_id', $groupId)->where('name', $name)->value('id');

                if (! $modifierId || ModifierRecipeItem::where('modifier_id', $modifierId)->exists()) {
                    continue;
                }

                foreach ($effects as [$action, $ingredient, $qty, $replaces]) {
                    ModifierRecipeItem::create([
                        'modifier_id' => $modifierId,
                        'ingredient_id' => $this->ingredientId($ingredient),
                        'quantity' => $qty,
                        'unit_id' => $this->baseUnitIds[$ingredient],
                        'action' => match ($action) {
                            'add' => ModifierAction::Add,
                            'remove' => ModifierAction::Remove,
                            'replace' => ModifierAction::Replace,
                        },
                        'replaces_ingredient_id' => $replaces ? $this->ingredientId($replaces) : null,
                    ]);
                }
            }
        }
    }

    /** @param array<int, array{0: string, 1: int|float}> $items */
    private function makeRecipe(int $productId, ?int $variantId, array $items): void
    {
        if (Recipe::where('product_id', $productId)->where('product_variant_id', $variantId)->exists()) {
            return;
        }

        $recipe = Recipe::create(['product_id' => $productId, 'product_variant_id' => $variantId, 'yield_quantity' => 1]);

        foreach ($items as [$name, $qty]) {
            $recipe->items()->create([
                'ingredient_id' => $this->ingredientId($name),
                'quantity' => $qty,
                'unit_id' => $this->baseUnitIds[$name],
            ]);
        }
    }

    private function ingredientId(string $name): int
    {
        return $this->ingredientIds[$name] ?? throw new RuntimeException("Unknown ingredient '{$name}'. Run DemoInventorySeeder first.");
    }
}
