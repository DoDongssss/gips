<?php

namespace Database\Seeders\Demo;

use App\Models\User;
use Database\Seeders\Support\SeedCredentials;
use Database\Seeders\System\PermissionSeeder;
use Database\Seeders\System\RoleSeeder;
use Illuminate\Database\Seeder;

/** Extra demo staff for local development only. Never runs in production. */
class DemoUserSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->warn('DemoUserSeeder skipped in production.');

            return;
        }

        $this->call([PermissionSeeder::class, RoleSeeder::class]);

        foreach (SeedCredentials::localDemoStaffAccounts() as $account) {
            $user = User::firstOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'password' => $account['password'],
                    'email_verified_at' => now(),
                ],
            );

            $user->syncRoles($account['role']);
        }
    }
}
