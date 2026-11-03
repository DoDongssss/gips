<?php

namespace Database\Seeders\Demo;

use App\Enums\SelectionType;
use Database\Seeders\Demo\Data\MenuCatalog;
use Database\Seeders\Demo\Data\ModifierCatalog;
use Database\Seeders\Reference\StationSeeder;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Demo menu: categories (routed to stations), 100 products with sizes, modifier groups and modifiers.
 * The data lives in Data\MenuCatalog and Data\ModifierCatalog.
 *
 * Safe to re-run: rows are matched by slug / name and never overwritten, and rows that were
 * soft-deleted in the app stay deleted. Writes with the query builder so it does not depend
 * on model fillable lists or observers. Stock effects are added by DemoRecipeSeeder.
 */
class DemoMenuSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(StationSeeder::class);

        DB::transaction(function () {
            $this->seedMenu($this->seedModifierGroups());
        });
    }

    /** @return array<string, int> modifier group name => id */
    private function seedModifierGroups(): array
    {
        $ids = [];

        foreach (ModifierCatalog::groups() as $i => $group) {
            $groupId = $this->firstOrInsert('modifier_groups', ['name' => $group['name']], [
                'selection_type' => ($group['type'] === 'single' ? SelectionType::Single : SelectionType::Multiple)->value,
                'is_required' => $group['required'],
                'min_select' => $group['min'],
                'max_select' => $group['max'],
                'sort_order' => $i + 1,
                'is_active' => true,
            ]);

            $ids[$group['name']] = $groupId;

            foreach ($group['modifiers'] as $j => [$name, $delta, $default]) {
                $this->firstOrInsert('modifiers', ['modifier_group_id' => $groupId, 'name' => $name], [
                    'price_delta_cents' => $delta,
                    'is_default' => $default,
                    'is_available' => true,
                    'sort_order' => $j + 1,
                ]);
            }
        }

        return $ids;
    }

    /** @param array<string, int> $groupIds */
    private function seedMenu(array $groupIds): void
    {
        $stations = DB::table('stations')->pluck('id', 'slug');

        foreach (MenuCatalog::categories() as $i => $category) {
            $categoryId = $this->firstOrInsert('categories', ['slug' => Str::slug($category['name'])], [
                'name' => $category['name'],
                'description' => $category['description'],
                'sort_order' => $i + 1,
                'is_active' => true,
            ]);

            $this->routeToStation($categoryId, $stations[$category['station']]);

            foreach ($category['products'] as $k => $product) {
                $productId = $this->firstOrInsert('products', ['slug' => Str::slug($product['name'])], [
                    'category_id' => $categoryId,
                    'name' => $product['name'],
                    'sku' => $product['sku'],
                    'base_price_cents' => $product['price'],
                    'is_taxable' => true,
                    'is_available' => true,
                    'is_active' => true,
                    'prep_time_seconds' => $product['prep'],
                    'sort_order' => $k + 1,
                ]);

                foreach ($product['variants'] as $v => [$size, $price, $default]) {
                    $this->firstOrInsert('product_variants', ['product_id' => $productId, 'name' => $size], [
                        'price_cents' => $price,
                        'is_default' => $default,
                        'is_active' => true,
                        'sort_order' => $v + 1,
                    ]);
                }

                foreach ($product['groups'] as $g => $groupName) {
                    $link = ['product_id' => $productId, 'modifier_group_id' => $groupIds[$groupName]];

                    if (! DB::table('product_modifier_groups')->where($link)->exists()) {
                        DB::table('product_modifier_groups')->insert($link + ['sort_order' => $g + 1]);
                    }
                }
            }
        }
    }

    private function routeToStation(int $categoryId, int $stationId): void
    {
        if (! DB::table('category_stations')->where('category_id', $categoryId)->exists()) {
            DB::table('category_stations')->insert([
                'category_id' => $categoryId,
                'station_id' => $stationId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $match
     * @param  array<string, mixed>  $values
     */
    private function firstOrInsert(string $table, array $match, array $values): int
    {
        $existing = DB::table($table)->where($match)->value('id');

        if ($existing) {
            return (int) $existing;
        }

        return (int) DB::table($table)->insertGetId($match + $values + ['created_at' => now(), 'updated_at' => now()]);
    }
}
