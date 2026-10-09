<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->accounts() as $account) {
            // Demo accounts are skipped in production.
            if ($account['demo'] && app()->environment('production')) {
                continue;
            }

            $user = User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'name'              => $account['name'],
                    'password'          => $account['password'],
                    'email_verified_at' => now(),
                ]
            );

            $user->syncRoles($account['role']);
        }
    }

    private function accounts(): array
    {
        return [
            [
                'name'     => 'Super Admin',
                'email'    => env('SUPER_ADMIN_EMAIL', 'superadmin@example.com'),
                'password' => env('SUPER_ADMIN_PASSWORD', 'password'),
                'role'     => 'superadmin',
                'demo'     => false,
            ],
            [
                'name'     => 'Store Owner',
                'email'    => env('OWNER_EMAIL', 'owner@example.com'),
                'password' => env('OWNER_PASSWORD', 'password'),
                'role'     => 'owner',
                'demo'     => false,
            ],
            [
                'name'     => 'Demo Manager',
                'email'    => 'manager@example.com',
                'password' => 'password',
                'role'     => 'manager',
                'demo'     => true,
            ],
            [
                'name'     => 'Demo Cashier',
                'email'    => 'cashier@example.com',
                'password' => 'password',
                'role'     => 'cashier',
                'demo'     => true,
            ],
            [
                'name'     => 'Demo Barista',
                'email'    => 'barista@example.com',
                'password' => 'password',
                'role'     => 'barista',
                'demo'     => true,
            ],
        ];
    }
}