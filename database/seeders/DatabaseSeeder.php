<?php

namespace Database\Seeders;

use Database\Seeders\Demo\DemoSeeder;
use Database\Seeders\Reference\DiscountSeeder;
use Database\Seeders\Reference\PaymentMethodSeeder;
use Database\Seeders\Reference\StationSeeder;
use Database\Seeders\Reference\TaxSeeder;
use Database\Seeders\Reference\UnitSeeder;
use Database\Seeders\System\ConfigurationSeeder;
use Database\Seeders\System\PermissionSeeder;
use Database\Seeders\System\RoleSeeder;
use Database\Seeders\System\UserSeeder;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Production: system access, store configuration, units/conversions, and POS reference data.
 * Local only: demo menu, inventory, and extra demo staff (see DemoSeeder).
 *
 *   php artisan db:seed
 *   php artisan db:seed --class="Database\Seeders\Demo\DemoSeeder"
 */
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            RoleSeeder::class,
            UserSeeder::class,
            ConfigurationSeeder::class,
            UnitSeeder::class,
            PaymentMethodSeeder::class,
            TaxSeeder::class,
            DiscountSeeder::class,
            StationSeeder::class,
        ]);

        if (app()->environment('local')) {
            $this->call(DemoSeeder::class);
        }
    }
}
