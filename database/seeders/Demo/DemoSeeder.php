<?php

namespace Database\Seeders\Demo;

use Illuminate\Database\Seeder;

/**
 * Development only: staff accounts, extra discounts, a 100-product menu, the ingredients behind it,
 * and the recipes that link the two.
 *
 *   php artisan db:seed --class="Database\Seeders\Demo\DemoSeeder"
 *
 * Order matters: recipes need both the menu and the ingredients. Each seeder below calls the
 * reference or system seeder it depends on, so this works on its own after a normal db:seed.
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            DemoUserSeeder::class,
            DemoDiscountSeeder::class,
            DemoMenuSeeder::class,
            DemoInventorySeeder::class,
            DemoRecipeSeeder::class,
        ]);
    }
}
