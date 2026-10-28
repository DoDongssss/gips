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
        'kiosk',                    
        'kitchen',           
        'api/v1/kiosk/pair',        
        'api/v1/devices/pair',      
        'email/verify*',
    ],

    // Public POST routes that limit attempts in code instead of with the throttle middleware.
    'throttle_exempt' => [
        'pin-login',                
        'login',                    
        'two-factor-challenge',    
        'forgot-password',         
        'reset-password',           
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
