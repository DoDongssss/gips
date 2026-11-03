<?php

namespace Database\Seeders\System;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * The owner and super admin accounts, taken from .env (SUPER_ADMIN_EMAIL, OWNER_EMAIL and their passwords).
 * An account that already exists keeps its name and password, so re-seeding never resets a password
 * someone has changed. Roles are re-synced every time. Demo staff live in Demo\DemoUserSeeder.
 */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->accounts() as $account) {
            if (app()->isProduction() && $account['password'] === 'password') {
                $this->command?->warn("{$account['email']} is using the default password. Set it in .env before seeding production.");
            }

            $user = User::firstOrCreate(
                ['email' => $account['email']],
                [
                    'name'              => $account['name'],
                    'password'          => $account['password'],
                    'email_verified_at' => now(),
                ],
            );

            $user->syncRoles($account['role']);
        }
    }

    /** @return array<int, array{name: string, email: string, password: string, role: string}> */
    private function accounts(): array
    {
        return [
            [
                'name'     => 'Super Admin',
                'email'    => env('SUPER_ADMIN_EMAIL', 'superadmin@example.com'),
                'password' => env('SUPER_ADMIN_PASSWORD', 'password'),
                'role'     => 'superadmin',
            ],
            [
                'name'     => 'Store Owner',
                'email'    => env('OWNER_EMAIL', 'owner@example.com'),
                'password' => env('OWNER_PASSWORD', 'password'),
                'role'     => 'owner',
            ],
        ];
    }
}
