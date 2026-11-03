<?php

/*
|--------------------------------------------------------------------------
| Web routes (loader)
|--------------------------------------------------------------------------
| One file per feature in routes/web/. Loaded inside the "web" middleware
| group by bootstrap/app.php, so files here must NOT re-add 'web'.
| Load order is kept identical to the original to preserve route matching.
*/

foreach ([
    'public',          // landing, kiosk/kitchen shells, PIN login
    'dashboard',       // dashboard, audit logs
    'administration',  // users, configurations, taxes, stations
    'menu',            // categories, products, modifiers
    'settings',        // profile, security, roles, printer, devices
    'orders',          // POS, orders, discounts
    'shifts',          // cash shifts
    'reports',         // reports, Z-reports
    'inventory',       // stock, purchasing, recipes
    'kiosk',           // kiosk screens + upsell rules (admin side)
] as $module) {
    require __DIR__."/web/{$module}.php";
}
