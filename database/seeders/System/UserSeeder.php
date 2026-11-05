<?php

namespace Database\Seeders\System;

use App\Models\User;
use Database\Seeders\Support\SeedCredentials;
use Illuminate\Database\Seeder;

/**
 * Core staff accounts. Production: superadmin, owner, manager, cashier @ kjips.com.
 * Local: superadmin and owner @ example.com; other roles come from DemoUserSeeder.
 * Existing users keep their password; roles are re-synced on every run.
 */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        foreach (SeedCredentials::coreAccounts() as $account) {
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
