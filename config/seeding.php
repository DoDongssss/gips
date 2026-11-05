<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default seed password
    |--------------------------------------------------------------------------
    |
    | Used when creating users via UserSeeder if role-specific *_PASSWORD env vars
    | are not set. When SEED_DEFAULT_PASSWORD is null, production uses kjips12345
    | and other environments use "password".
    |
    */

    'default_password' => env('SEED_DEFAULT_PASSWORD'),

    /*
    |--------------------------------------------------------------------------
    | Production staff emails
    |--------------------------------------------------------------------------
    |
    | Override in .env on production deploys if needed. UserSeeder falls back to
    | these when APP_ENV=production.
    |
    */

    'production_emails' => [
        'superadmin' => env('SUPER_ADMIN_EMAIL', 'superadmin@kjips.com'),
        'owner' => env('OWNER_EMAIL', 'owner@kjips.com'),
        'manager' => env('MANAGER_EMAIL', 'manager@kjips.com'),
        'cashier' => env('CASHIER_EMAIL', 'cashier@kjips.com'),
    ],

];
