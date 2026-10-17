<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Demo menu: categories, products, sizes, modifier groups and modifiers.
 * Prices are centavos. Safe to re-run: rows are matched by slug / name and never overwritten.
 * Writes with the query builder so it does not depend on model names or observers.
 */
class MenuSeeder extends Seeder
{
    public function run(): void
    {
        $groupIds = [];

        foreach ($this->modifierGroups() as $i => $group) {
            $groupId = $this->firstOrInsert('modifier_groups', ['name' => $group['name']], [
                'selection_type' => $group['type'], 'is_required' => $group['required'] ?? false,
                'min_select' => $group['min'] ?? 0, 'max_select' => $group['max'] ?? null,
                'sort_order' => $i, 'is_active' => true,
            ]);
            $groupIds[$group['name']] = $groupId;

            foreach ($group['modifiers'] as $j => [$name, $delta, $default]) {
                $this->firstOrInsert('modifiers', ['modifier_group_id' => $groupId, 'name' => $name], [
                    'price_delta_cents' => $delta, 'is_default' => $default, 'is_available' => true, 'sort_order' => $j,
                ]);
            }
        }

        foreach ($this->categories() as $i => $category) {
            $categoryId = $this->firstOrInsert('categories', ['slug' => Str::slug($category['name'])], [
                'name' => $category['name'], 'description' => $category['description'] ?? null,
                'sort_order' => $i, 'is_active' => true,
            ]);

            foreach ($category['products'] as $k => $product) {
                $variants = $product['variants'] ?? [];
                $defaultPrice = $product['price'] ?? 0;

                foreach ($variants as [, $price, $isDefault]) {
                    if ($isDefault) {
                        $defaultPrice = $price;
                    }
                }

                $productId = $this->firstOrInsert('products', ['slug' => Str::slug($product['name'])], [
                    'category_id' => $categoryId, 'name' => $product['name'], 'sku' => $product['sku'] ?? null,
                    'description' => $product['description'] ?? null, 'base_price_cents' => $defaultPrice,
                    'is_taxable' => true, 'is_available' => true, 'is_active' => true,
                    'prep_time_seconds' => $product['prep'] ?? 180, 'sort_order' => $k,
                ]);

                foreach ($variants as $v => [$name, $price, $default]) {
                    $this->firstOrInsert('product_variants', ['product_id' => $productId, 'name' => $name], [
                        'price_cents' => $price, 'is_default' => $default, 'is_active' => true, 'sort_order' => $v,
                    ]);
                }

                foreach ($product['groups'] ?? [] as $g => $groupName) {
                    DB::table('product_modifier_groups')->insertOrIgnore([
                        'product_id' => $productId, 'modifier_group_id' => $groupIds[$groupName], 'sort_order' => $g,
                    ]);
                }
            }
        }
    }

    /** @return array<int, array<string, mixed>> */
    private function categories(): array
    {
        $hot = [['Small 8oz', 9500, false], ['Regular 12oz', 11000, true]];
        $iced = [['Regular 16oz', 12000, true], ['Large 22oz', 14500, false]];

        return [
            ['name' => 'Hot Coffee', 'products' => [
                ['name' => 'Espresso', 'price' => 8000, 'prep' => 90, 'groups' => ['Extra']],
                ['name' => 'Hot Americano', 'variants' => $hot, 'groups' => ['Extra', 'Syrup']],
                ['name' => 'Hot Latte', 'variants' => [['Small 8oz', 12000, false], ['Regular 12oz', 13500, true]], 'groups' => ['Milk', 'Extra', 'Syrup']],
                ['name' => 'Cappuccino', 'variants' => [['Small 8oz', 12000, false], ['Regular 12oz', 13500, true]], 'groups' => ['Milk', 'Extra', 'Syrup']],
            ]],
            ['name' => 'Iced Coffee', 'products' => [
                ['name' => 'Iced Americano', 'variants' => [['Regular 16oz', 11000, true], ['Large 22oz', 13000, false]], 'groups' => ['Extra', 'Syrup', 'Ice Level']],
                ['name' => 'Iced Latte', 'variants' => $iced, 'groups' => ['Milk', 'Extra', 'Syrup', 'Ice Level']],
                ['name' => 'Iced Caramel Macchiato', 'variants' => [['Regular 16oz', 14500, true], ['Large 22oz', 16500, false]], 'groups' => ['Milk', 'Extra', 'Ice Level']],
            ]],
            ['name' => 'Non-Coffee', 'products' => [
                ['name' => 'Iced Matcha Latte', 'variants' => [['Regular 16oz', 14000, true], ['Large 22oz', 16000, false]], 'groups' => ['Milk', 'Syrup', 'Ice Level']],
                ['name' => 'Iced Chocolate', 'variants' => [['Regular 16oz', 12500, true], ['Large 22oz', 14500, false]], 'groups' => ['Milk', 'Ice Level']],
            ]],
            ['name' => 'Pastries', 'products' => [
                ['name' => 'Butter Croissant', 'price' => 8500, 'prep' => 60],
                ['name' => 'Chocolate Muffin', 'price' => 9500, 'prep' => 60],
            ]],
            ['name' => 'Sandwiches', 'products' => [
                ['name' => 'Ham & Cheese Sandwich', 'price' => 15500, 'prep' => 240],
            ]],
        ];
    }

    /**
     * Each modifier: [name, price delta in centavos, is default].
     *
     * @return array<int, array<string, mixed>>
     */
    private function modifierGroups(): array
    {
        return [
            ['name' => 'Milk', 'type' => 'single', 'max' => 1, 'modifiers' => [
                ['Whole milk', 0, true], ['Oat milk', 4000, false],
            ]],
            ['name' => 'Extra', 'type' => 'multiple', 'modifiers' => [
                ['Extra shot', 4000, false],
            ]],
            ['name' => 'Syrup', 'type' => 'multiple', 'max' => 2, 'modifiers' => [
                ['Vanilla syrup', 2500, false], ['Caramel syrup', 2500, false], ['Hazelnut syrup', 2500, false],
            ]],
            ['name' => 'Ice Level', 'type' => 'single', 'max' => 1, 'modifiers' => [
                ['Regular ice', 0, true], ['Less ice', 0, false], ['No ice', 0, false],
            ]],
        ];
    }

    /** @param array<string, mixed> $match @param array<string, mixed> $values */
    private function firstOrInsert(string $table, array $match, array $values): int
    {
        $existing = DB::table($table)->where($match)->value('id');

        if ($existing) {
            return (int) $existing;
        }

        return (int) DB::table($table)->insertGetId($match + $values + ['created_at' => now(), 'updated_at' => now()]);
    }
}
