<?php

namespace Database\Seeders;

use App\Enums\StockMovementType;
use App\Models\Ingredient;
use App\Models\IngredientCategory;
use App\Models\Product;
use App\Models\Recipe;
use App\Models\Unit;
use App\Services\Inventory\StockService;
use Illuminate\Database\Seeder;

/** Development only. Safe to re-run. Recipes attach only to demo products that exist (by name). */
class DemoInventorySeeder extends Seeder
{
    public function run(StockService $stock): void
    {
        $this->call(UnitSeeder::class);

        $u = Unit::pluck('id', 'abbreviation');
        $cat = fn (string $n) => IngredientCategory::firstOrCreate(['name' => $n])->id;

        // name => [category, base unit, reorder level, cost per base unit in centavos, opening stock]
        $rows = [
            'Espresso beans' => ['Coffee', 'g', 2000, 1.2, 10000],
            'Whole milk' => ['Dairy', 'ml', 5000, 0.07, 20000],
            'Oat milk' => ['Dairy', 'ml', 3000, 0.16, 8000],
            'Ice' => ['Other', 'g', 5000, 0.01, 30000],
            'Cup 16oz' => ['Packaging', 'pc', 50, 3.5, 300],
            'Lid' => ['Packaging', 'pc', 50, 1.2, 300],
        ];

        $made = [];

        foreach ($rows as $name => [$category, $unit, $reorder, $cost, $open]) {
            $ingredient = Ingredient::firstOrCreate(['name' => $name], [
                'ingredient_category_id' => $cat($category), 'base_unit_id' => $u[$unit],
                'reorder_level' => $reorder, 'average_cost_cents' => $cost,
            ]);

            if (! $ingredient->movements()->exists()) {
                $stock->record($ingredient, StockMovementType::Adjustment, $open, $cost, null, null, 'Demo opening stock');
            }

            $made[$name] = $ingredient;
        }

        $latte = Product::where('name', 'Iced Latte')->first();

        if ($latte && ! Recipe::where('product_id', $latte->id)->whereNull('product_variant_id')->exists()) {
            $recipe = Recipe::create(['product_id' => $latte->id, 'yield_quantity' => 1]);

            foreach ([['Espresso beans', 18, 'g'], ['Whole milk', 180, 'ml'], ['Ice', 120, 'g'], ['Cup 16oz', 1, 'pc'], ['Lid', 1, 'pc']] as [$n, $q, $unit]) {
                $recipe->items()->create(['ingredient_id' => $made[$n]->id, 'quantity' => $q, 'unit_id' => $u[$unit]]);
            }
        }
    }
}
