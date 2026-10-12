<?php

namespace Database\Seeders;

use App\Enums\DiscountScope;
use App\Enums\DiscountType;
use App\Enums\SelectionType;
use App\Models\Category;
use App\Models\Discount;
use App\Models\Modifier;
use App\Models\ModifierGroup;
use App\Models\Product;
use App\Models\Station;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Dummy menu for development only: categories, products with sizes, add-ons and a few discounts.
 * Not part of DatabaseSeeder. Run it with: php artisan db:seed --class=DemoMenuSeeder
 * Safe to run again: rows are matched by name and updated, never duplicated.
 */
class DemoMenuSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(StationSeeder::class);

        DB::transaction(function () {
            $groups = $this->modifierGroups();
            $categories = $this->categories();

            $this->products($categories, $groups);
            $this->discounts();
        });
    }

    /** @return array<string, ModifierGroup> */
    private function modifierGroups(): array
    {
        $definitions = [
            'Milk' => [SelectionType::Single, true, 1, 1, [
                ['Whole milk', 0, true], ['Oat milk', 3000, false], ['Almond milk', 3000, false],
            ]],
            'Sugar level' => [SelectionType::Single, false, 0, 1, [
                ['100% sugar', 0, true], ['50% sugar', 0, false], ['No sugar', 0, false],
            ]],
            'Extras' => [SelectionType::Multiple, false, 0, 3, [
                ['Extra shot', 5000, false], ['Whipped cream', 2000, false], ['Caramel drizzle', 2500, false],
            ]],
            'Rice' => [SelectionType::Single, true, 1, 1, [
                ['Plain rice', 0, true], ['Garlic rice', 2500, false],
            ]],
        ];

        $groups = [];
        $order = 0;

        foreach ($definitions as $name => [$type, $required, $min, $max, $modifiers]) {
            $group = ModifierGroup::withTrashed()->updateOrCreate(['name' => $name], [
                'selection_type' => $type,
                'is_required' => $required,
                'min_select' => $min,
                'max_select' => $max,
                'sort_order' => ++$order,
                'is_active' => true,
                'deleted_at' => null,
            ]);

            foreach ($modifiers as $index => [$modifierName, $delta, $default]) {
                Modifier::withTrashed()->updateOrCreate(
                    ['modifier_group_id' => $group->id, 'name' => $modifierName],
                    ['price_delta_cents' => $delta, 'is_default' => $default, 'is_available' => true, 'sort_order' => $index + 1, 'deleted_at' => null],
                );
            }

            $groups[$name] = $group;
        }

        return $groups;
    }

    /** @return array<string, Category> */
    private function categories(): array
    {
        $definitions = [
            'Coffee' => 'bar',
            'Non-Coffee' => 'bar',
            'Pastries' => 'pastry',
            'Meals' => 'kitchen',
        ];

        $categories = [];
        $order = 0;

        foreach ($definitions as $name => $stationSlug) {
            $category = Category::withTrashed()->updateOrCreate(['slug' => Str::slug($name)], [
                'name' => $name,
                'sort_order' => ++$order,
                'is_active' => true,
                'deleted_at' => null,
            ]);

            DB::table('category_stations')->updateOrInsert(
                ['category_id' => $category->id],
                ['station_id' => Station::where('slug', $stationSlug)->value('id'), 'created_at' => now(), 'updated_at' => now()],
            );

            $categories[$name] = $category;
        }

        return $categories;
    }

    /**
     * @param  array<string, Category>  $categories
     * @param  array<string, ModifierGroup>  $groups
     */
    private function products(array $categories, array $groups): void
    {
        $sizes = fn (int $small, int $medium, int $large) => [['Small', $small], ['Medium', $medium], ['Large', $large]];

        // [category, name, base price in centavos, sizes (name, price) or [], modifier groups]
        $products = [
            ['Coffee', 'Americano', 9000, $sizes(9000, 10500, 12000), ['Sugar level', 'Extras']],
            ['Coffee', 'Cafe Latte', 12000, $sizes(12000, 13500, 15000), ['Milk', 'Sugar level', 'Extras']],
            ['Coffee', 'Cappuccino', 12500, $sizes(12500, 14000, 15500), ['Milk', 'Extras']],
            ['Coffee', 'Spanish Latte', 13500, $sizes(13500, 15000, 16500), ['Milk', 'Sugar level', 'Extras']],
            ['Non-Coffee', 'Matcha Latte', 14500, $sizes(14500, 16000, 17500), ['Milk', 'Sugar level']],
            ['Non-Coffee', 'Chocolate', 12000, $sizes(12000, 13500, 15000), ['Milk', 'Extras']],
            ['Non-Coffee', 'Iced Tea', 8000, [], ['Sugar level']],
            ['Pastries', 'Butter Croissant', 8500, [], []],
            ['Pastries', 'Blueberry Muffin', 7500, [], []],
            ['Pastries', 'Chocolate Chip Cookie', 6000, [], []],
            ['Pastries', 'Cheesecake Slice', 15000, [], []],
            ['Meals', 'Chicken Adobo Rice', 18500, [], ['Rice']],
            ['Meals', 'Beef Tapa Rice', 20500, [], ['Rice']],
            ['Meals', 'Club Sandwich', 16500, [], []],
        ];

        foreach ($products as $index => [$categoryName, $name, $price, $variants, $groupNames]) {
            $product = Product::withTrashed()->updateOrCreate(['slug' => Str::slug($name)], [
                'category_id' => $categories[$categoryName]->id,
                'name' => $name,
                'base_price_cents' => $price,
                'is_taxable' => true,
                'is_available' => true,
                'is_active' => true,
                'sort_order' => $index + 1,
                'deleted_at' => null,
            ]);

            foreach ($variants as $variantIndex => [$variantName, $variantPrice]) {
                $product->variants()->withTrashed()->updateOrCreate(['name' => $variantName], [
                    'price_cents' => $variantPrice,
                    'is_default' => $variantIndex === 0,
                    'is_active' => true,
                    'sort_order' => $variantIndex + 1,
                    'deleted_at' => null,
                ]);
            }

            $product->modifierGroups()->sync(
                collect($groupNames)->values()->mapWithKeys(fn (string $group, int $i) => [$groups[$group]->id => ['sort_order' => $i + 1]])->all(),
            );
        }
    }

    private function discounts(): void
    {
        $discounts = [
            // code, name, type, value, scope, needs ID, needs manager approval, VAT exempt
            ['PROMO10', '10% Promo', DiscountType::Percent, 1000, DiscountScope::Order, false, false, false],
            ['STAFF20', 'Staff Meal 20%', DiscountType::Percent, 2000, DiscountScope::Order, false, true, false],
            ['VOUCHER50', 'P50 Voucher', DiscountType::Fixed, 5000, DiscountScope::Order, false, false, false],
            ['FREECOOKIE', 'Free Cookie (item)', DiscountType::Percent, 10000, DiscountScope::Item, false, true, false],
        ];

        foreach ($discounts as [$code, $name, $type, $value, $scope, $requiresId, $requiresApproval, $vatExempt]) {
            Discount::updateOrCreate(['code' => $code], [
                'name' => $name,
                'type' => $type,
                'value' => $value,
                'applies_to' => $scope,
                'requires_id' => $requiresId,
                'requires_approval' => $requiresApproval,
                'is_vat_exempt' => $vatExempt,
                'is_active' => true,
            ]);
        }
    }
}
