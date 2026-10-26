<?php

namespace Database\Seeders\Demo;

use App\Models\User;
use Database\Seeders\System\PermissionSeeder;
use Database\Seeders\System\RoleSeeder;
use Illuminate\Database\Seeder;

/** Demo staff, one per working role. Password is "password". Never run in production. */
class DemoUserSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->warn('DemoUserSeeder skipped in production.');

            return;
        }

        $this->call([PermissionSeeder::class, RoleSeeder::class]);

        foreach ([
            ['Demo Manager', 'manager@example.com', 'manager'],
            ['Demo Cashier', 'cashier@example.com', 'cashier'],
            ['Demo Barista', 'barista@example.com', 'barista'],
            ['Demo Kitchen', 'kitchen@example.com', 'kitchen'],
        ] as [$name, $email, $role]) {
            $user = User::firstOrCreate(
                ['email' => $email],
                ['name' => $name, 'password' => 'password', 'email_verified_at' => now()],
            );

            $user->syncRoles($role);
        }
    }
}
