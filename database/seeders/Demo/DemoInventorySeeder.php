<?php

namespace Database\Seeders\Demo;

use App\Enums\StockMovementType;
use App\Models\Ingredient;
use App\Models\IngredientCategory;
use App\Models\Supplier;
use App\Models\SupplierIngredient;
use App\Models\Unit;
use App\Models\UnitConversion;
use App\Services\Inventory\StockService;
use Database\Seeders\Demo\Data\IngredientCatalog;
use Database\Seeders\Reference\UnitSeeder;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Demo ingredients with opening stock, plus suppliers with price lists. The data lives in Data\IngredientCatalog.
 *
 * Ingredient costs are centavos per BASE unit. Each supplier price is that cost multiplied up to the
 * purchase unit (120 centavos per gram = 120000 per kg), so the two always agree.
 *
 * Safe to re-run: existing rows are kept, and opening stock is only recorded once per ingredient.
 */
class DemoInventorySeeder extends Seeder
{
    public function run(StockService $stock): void
    {
        $this->call(UnitSeeder::class);

        $units = Unit::pluck('id', 'abbreviation');
        $categoryIds = [];
        $ingredients = [];

        foreach (IngredientCatalog::ingredients() as $name => [$category, $base, $purchase, $reorder, $cost, $opening]) {
            $categoryIds[$category] ??= IngredientCategory::firstOrCreate(['name' => $category])->id;

            $ingredient = Ingredient::firstOrCreate(['name' => $name], [
                'ingredient_category_id' => $categoryIds[$category],
                'base_unit_id' => $this->unit($units, $base),
                'purchase_unit_id' => $this->unit($units, $purchase),
                'average_cost_cents' => $cost,
                'reorder_level' => $reorder,
                'is_active' => true,
            ]);

            if ($opening > 0 && ! $ingredient->movements()->exists()) {
                $stock->record($ingredient, StockMovementType::Adjustment, $opening, $cost, null, null, 'Demo opening stock');
            }

            $ingredients[$name] = $ingredient;
        }

        $conversions = UnitConversion::all()
            ->mapWithKeys(fn ($c) => ["{$c->from_unit_id}>{$c->to_unit_id}" => (float) $c->factor])
            ->all();

        foreach (IngredientCatalog::suppliers() as $supplierName => [$phone, $supplied]) {
            $supplier = Supplier::firstOrCreate(['name' => $supplierName], ['phone' => $phone, 'is_active' => true]);

            foreach (IngredientCatalog::ingredients() as $name => [$category, $base, $purchase, , $cost]) {
                if (! in_array($category, $supplied, true)) {
                    continue;
                }

                $purchaseId = $this->unit($units, $purchase);
                $baseId = $this->unit($units, $base);

                $perPurchaseUnit = $purchaseId === $baseId
                    ? 1.0
                    : ($conversions["{$purchaseId}>{$baseId}"] ?? throw new RuntimeException("No conversion from '{$purchase}' to '{$base}' for '{$name}'."));

                SupplierIngredient::firstOrCreate(
                    ['supplier_id' => $supplier->id, 'ingredient_id' => $ingredients[$name]->id],
                    ['unit_id' => $purchaseId, 'unit_cost_cents' => (int) round($cost * $perPurchaseUnit), 'is_preferred' => true],
                );
            }
        }
    }

    private function unit($units, string $abbreviation): int
    {
        return $units[$abbreviation] ?? throw new RuntimeException("Unit '{$abbreviation}' is missing. Run Reference\\UnitSeeder.");
    }
}
