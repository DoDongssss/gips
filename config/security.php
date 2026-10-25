<?php

return [
    // Roles that must have two-factor authentication switched on before they can use the system.
    'require_2fa_roles' => [],

    // Turn on in production once the owner and super-admin have set up 2FA (REQUIRE_2FA=true in .env).
    'require_2fa' => (bool) env('REQUIRE_2FA', false),

    // Where those users are sent to set it up (Fortify starter kit: settings/security).
    'two_factor_setup_path' => 'settings/security',

    // Public POST routes defined by Fortify, limited by App\Http\Middleware\ThrottleSensitiveRoutes: path => [attempts, seconds].
    'throttled_posts' => [
        'forgot-password' => [5, 60],
        'reset-password' => [5, 60],
    ],
];
