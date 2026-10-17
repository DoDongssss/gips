<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Development only. Loads the demo menu, inventory, suppliers and the recipes that link them.
 *
 *   php artisan db:seed --class=PosDemoSeeder
 *
 * Or call it from DatabaseSeeder inside an `if (app()->environment('local'))` block.
 * Safe to re-run. Order matters: recipes need both the menu and the ingredients.
 */
class PosDemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UnitSeeder::class,
            MenuSeeder::class,
            InventorySeeder::class,
            RecipeSeeder::class,
        ]);
    }
}
