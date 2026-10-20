<?php

/*
 | Used by `php artisan routes:audit` and tests/Feature/Security/RoutePermissionsTest.php.
 | Every route must either be listed as public here, be a kiosk device route, or require a signed-in user
 | AND a permission/role. Anything else is reported. Patterns use Str::is() (* wildcard) against the URI.
 | Public POST routes must also have a rate limit (throttle) unless listed in throttle_exempt.
 */
return [
    // Open to anyone on purpose.
    'public' => [
        '/',
        'up',
        'login',
        'forgot-password',
        'reset-password*',
        'two-factor-challenge',
        'pin-login',
        'pin-login/*',
        'storage/*',
        'sanctum/csrf-cookie',
        'kiosk',                    // the kiosk tablet page; the API behind it needs a device token
        'kitchen-screen',           // the kitchen screen page; its data needs a device token
        'api/v1/kiosk/pair',        // throttled; trades a one-time code for a device token
        'api/v1/devices/pair',      // pairing for the kitchen screen; must be throttled too
        'email/verify*',
    ],

    // Public POST routes that limit attempts in code instead of with the throttle middleware.
    'throttle_exempt' => [
        'pin-login',                // PinLoginController locks out by user and IP
        'login',                    // Fortify's own login limiter
        'two-factor-challenge',     // Fortify's own limiter
        'forgot-password',          // ThrottleSensitiveRoutes (config/security.php throttled_posts)
        'reset-password',           // ThrottleSensitiveRoutes
    ],

    // Signed in is enough on purpose (no permission): each person's own pages and shared plumbing.
    'auth_only' => [
        'dashboard',
        'settings',
        'settings/*',
        'user/*',
        'logout',
        'confirm-password',
        'verify-email*',
        'email/*',
        'password',
        'api/v1/pos/config',
        'broadcasting/auth',        // channel rules live in routes/channels.php
    ],
];
