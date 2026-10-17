<?php

namespace Database\Seeders;

use App\Enums\StockMovementType;
use App\Models\Ingredient;
use App\Models\IngredientCategory;
use App\Models\Supplier;
use App\Models\SupplierIngredient;
use App\Models\Unit;
use App\Services\Inventory\StockService;
use Illuminate\Database\Seeder;

/**
 * Demo ingredients with opening stock, plus two suppliers with price lists.
 * Costs are centavos PER BASE UNIT (1200 pesos/kg of beans = 120 centavos per gram).
 * Safe to re-run: existing rows are kept, and opening stock is only recorded once per ingredient.
 */
class InventorySeeder extends Seeder
{
    public function run(StockService $stock): void
    {
        $this->call(UnitSeeder::class);

        $u = Unit::pluck('id', 'abbreviation');

        $ingredients = [];

        // name => [category, base unit, purchase unit, reorder level, cost per base unit (centavos), opening stock]
        foreach ($this->ingredients() as $name => [$category, $base, $purchase, $reorder, $cost, $opening]) {
            $categoryId = IngredientCategory::firstOrCreate(['name' => $category])->id;

            $ingredient = Ingredient::firstOrCreate(['name' => $name], [
                'ingredient_category_id' => $categoryId, 'base_unit_id' => $u[$base], 'purchase_unit_id' => $u[$purchase],
                'average_cost_cents' => $cost, 'reorder_level' => $reorder, 'is_active' => true,
            ]);

            if (! $ingredient->movements()->exists() && $opening > 0) {
                $stock->record($ingredient, StockMovementType::Adjustment, $opening, $cost, null, null, 'Demo opening stock');
            }

            $ingredients[$name] = $ingredient;
        }

        // supplier => [phone, [ingredient => [purchase unit, cost per purchase unit in centavos, preferred]]]
        $suppliers = [
            'Bean & Brew Trading' => ['0917 000 0001', [
                'Espresso beans' => ['kg', 120000, true], 'Matcha powder' => ['kg', 240000, true],
                'Chocolate sauce' => ['l', 40000, true], 'Caramel syrup' => ['l', 45000, true],
                'Vanilla syrup' => ['l', 45000, true], 'Hazelnut syrup' => ['l', 45000, true],
            ]],
            'Metro Fresh Supply' => ['0917 000 0002', [
                'Whole milk' => ['l', 9500, true], 'Oat milk' => ['l', 22000, true],
                'Ice' => ['kg', 200, true], 'Butter croissant' => ['pc', 3500, true],
                'Chocolate muffin' => ['pc', 4000, true], 'Sandwich bread' => ['pc', 600, true],
                'Ham slice' => ['pc', 900, true], 'Cheese slice' => ['pc', 700, true],
                'Hot cup 8oz' => ['pc', 300, true], 'Hot cup 12oz' => ['pc', 400, true],
                'Cold cup 16oz' => ['pc', 400, true], 'Cold cup 22oz' => ['pc', 500, true],
                'Cold lid' => ['pc', 150, true], 'Hot lid' => ['pc', 150, true],
            ]],
        ];

        foreach ($suppliers as $name => [$phone, $prices]) {
            $supplier = Supplier::firstOrCreate(['name' => $name], ['phone' => $phone, 'is_active' => true]);

            foreach ($prices as $ingredient => [$unit, $cost, $preferred]) {
                SupplierIngredient::firstOrCreate(
                    ['supplier_id' => $supplier->id, 'ingredient_id' => $ingredients[$ingredient]->id],
                    ['unit_id' => $u[$unit], 'unit_cost_cents' => $cost, 'is_preferred' => $preferred],
                );
            }
        }
    }

    /** @return array<string, array{0: string, 1: string, 2: string, 3: int|float, 4: int|float, 5: int|float}> */
    private function ingredients(): array
    {
        return [
            'Espresso beans' => ['Coffee', 'g', 'kg', 2000, 120, 10000],
            'Matcha powder' => ['Coffee', 'g', 'kg', 300, 240, 1500],
            'Whole milk' => ['Dairy', 'ml', 'l', 5000, 9.5, 20000],
            'Oat milk' => ['Dairy', 'ml', 'l', 3000, 22, 8000],
            'Chocolate sauce' => ['Syrups', 'ml', 'l', 500, 40, 3000],
            'Caramel syrup' => ['Syrups', 'ml', 'l', 500, 45, 3000],
            'Vanilla syrup' => ['Syrups', 'ml', 'l', 500, 45, 3000],
            'Hazelnut syrup' => ['Syrups', 'ml', 'l', 500, 45, 3000],
            'Ice' => ['Other', 'g', 'kg', 5000, 0.2, 40000],
            'Butter croissant' => ['Bakery', 'pc', 'pc', 10, 3500, 40],
            'Chocolate muffin' => ['Bakery', 'pc', 'pc', 10, 4000, 40],
            'Sandwich bread' => ['Bakery', 'pc', 'pc', 20, 600, 100],
            'Ham slice' => ['Bakery', 'pc', 'pc', 20, 900, 100],
            'Cheese slice' => ['Bakery', 'pc', 'pc', 20, 700, 100],
            'Hot cup 8oz' => ['Packaging', 'pc', 'pc', 50, 300, 300],
            'Hot cup 12oz' => ['Packaging', 'pc', 'pc', 50, 400, 300],
            'Cold cup 16oz' => ['Packaging', 'pc', 'pc', 50, 400, 300],
            'Cold cup 22oz' => ['Packaging', 'pc', 'pc', 50, 500, 300],
            'Cold lid' => ['Packaging', 'pc', 'pc', 50, 150, 600],
            'Hot lid' => ['Packaging', 'pc', 'pc', 50, 150, 600],
        ];
    }
}
