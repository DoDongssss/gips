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
 * Production-safe data first, demo data last (local only).
 *
 *   php artisan db:seed                          system + reference data (+ demo data when APP_ENV=local)
 *   php artisan db:seed --class="Database\Seeders\Demo\DemoSeeder"   demo data on any environment
 *
 * Every seeder is safe to re-run. See README.md in this folder for what each one overwrites.
 */
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            // System: access and settings. Permissions -> roles -> users.
            PermissionSeeder::class,
            // RoleSeeder::class,
            // UserSeeder::class,
            // ConfigurationSeeder::class,

            // // Reference: lookup data the app cannot run without.
            // UnitSeeder::class,
            // PaymentMethodSeeder::class,
            // TaxSeeder::class,
            // DiscountSeeder::class,
            // StationSeeder::class,
        ]);

        if (app()->environment('local')) {
            $this->call(DemoSeeder::class);
        }
    }
}
