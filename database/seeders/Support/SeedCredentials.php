<?php

namespace Database\Seeders\Support;

use Database\Seeders\System\UserSeeder;

/**
 * Default emails and passwords for {@see UserSeeder} and login demo hints.
 * Production defaults use @kjips.com and {@see DEFAULT_PRODUCTION_PASSWORD}; local uses @example.com.
 */
final class SeedCredentials
{
    public const DEFAULT_PRODUCTION_PASSWORD = 'kjips12345';

    public const DEFAULT_LOCAL_PASSWORD = 'password';

    public static function defaultPassword(): string
    {
        if ($fromEnv = env('SEED_DEFAULT_PASSWORD')) {
            return $fromEnv;
        }

        return app()->isProduction()
            ? self::DEFAULT_PRODUCTION_PASSWORD
            : self::DEFAULT_LOCAL_PASSWORD;
    }

    /**
     * Core staff seeded on every environment (roles differ by count in production vs local).
     *
     * @return list<array{name: string, email: string, password: string, role: string}>
     */
    public static function coreAccounts(): array
    {
        $password = self::defaultPassword();

        if (app()->isProduction()) {
            /** @var array{superadmin: string, owner: string, manager: string, cashier: string} $emails */
            $emails = config('seeding.production_emails');

            return [
                [
                    'name' => 'Super Admin',
                    'email' => $emails['superadmin'],
                    'password' => env('SUPER_ADMIN_PASSWORD', $password),
                    'role' => 'superadmin',
                ],
                [
                    'name' => 'Store Owner',
                    'email' => $emails['owner'],
                    'password' => env('OWNER_PASSWORD', $password),
                    'role' => 'owner',
                ],
                [
                    'name' => 'Manager',
                    'email' => $emails['manager'],
                    'password' => env('MANAGER_PASSWORD', $password),
                    'role' => 'manager',
                ],
                [
                    'name' => 'Cashier',
                    'email' => $emails['cashier'],
                    'password' => env('CASHIER_PASSWORD', $password),
                    'role' => 'cashier',
                ],
            ];
        }

        return [
            [
                'name' => 'Super Admin',
                'email' => env('SUPER_ADMIN_EMAIL', 'superadmin@example.com'),
                'password' => env('SUPER_ADMIN_PASSWORD', $password),
                'role' => 'superadmin',
            ],
            [
                'name' => 'Store Owner',
                'email' => env('OWNER_EMAIL', 'owner@example.com'),
                'password' => env('OWNER_PASSWORD', $password),
                'role' => 'owner',
            ],
        ];
    }

    /**
     * Accounts shown on the login page when not in production.
     *
     * @return list<array{label: string, email: string, password: string}>
     */
    public static function loginDemoHints(): array
    {
        if (app()->isProduction()) {
            return [];
        }

        $hints = [];
        foreach (self::coreAccounts() as $account) {
            $hints[] = [
                'label' => $account['name'],
                'email' => $account['email'],
                'password' => $account['password'],
            ];
        }

        foreach (self::localDemoStaffAccounts() as $account) {
            $hints[] = [
                'label' => $account['name'],
                'email' => $account['email'],
                'password' => $account['password'],
            ];
        }

        return $hints;
    }

    /**
     * Extra roles seeded only in non-production via {@see DemoUserSeeder}.
     *
     * @return list<array{name: string, email: string, password: string, role: string}>
     */
    public static function localDemoStaffAccounts(): array
    {
        $password = self::defaultPassword();

        return [
            ['name' => 'Demo Manager', 'email' => 'manager@example.com', 'password' => $password, 'role' => 'manager'],
            ['name' => 'Demo Cashier', 'email' => 'cashier@example.com', 'password' => $password, 'role' => 'cashier'],
        ];
    }
}
