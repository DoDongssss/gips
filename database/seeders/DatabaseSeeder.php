<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            RoleSeeder::class,
            PaymentMethodSeeder::class,
            TaxSeeder::class,
            DiscountSeeder::class,
            StationSeeder::class,
            UserSeeder::class,
            ConfigurationSeeder::class,
            DemoMenuSeeder::class,
            PaymentMethodSeeder::class,
            DemoInventorySeeder::class,
            InventorySeeder::class,
            UnitSeeder::class,
            PosDemoSeeder::class,
            RecipeSeeder::class,
        ]);
    }
}
