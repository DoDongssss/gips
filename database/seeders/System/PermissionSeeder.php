<?php

namespace Database\Seeders\System;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

/** Every permission as resource.action. Add new permissions here, then grant them in RoleSeeder. */
class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            // Phase 1: access and system
            'user'      => ['view', 'create', 'update', 'delete', 'reset-credentials'],
            'role'      => ['manage'],
            'setting'   => ['view', 'update'],
            'audit'     => ['view'],

            // Phase 2: menu (availability = sold-out toggle, allowed for cashier)
            'menu'      => ['view', 'create', 'update', 'delete', 'availability'],

            // Phase 3: ordering and payments
            'order'     => ['view', 'create', 'update', 'void', 'price-override'],
            'discount'  => ['apply', 'manage'],
            'payment'   => ['take', 'refund'],

            // Phase 4: kitchen display
            'kds'       => ['view', 'bump'],

            // Phase 5: shifts and reports
            'shift'     => ['open', 'reopen' , 'close', 'view-all'],
            'report'    => ['reopen', 'view', 'export'],

            // Phase 6: inventory, recipes, purchasing
            'inventory' => ['view', 'adjust', 'count', 'receive'],
            'recipe'    => ['manage'],
            'supplier'  => ['manage'],
            'purchase'  => ['manage'],

            // Phase 7: kiosk and devices
            'device'    => ['manage'],
        ];

        foreach ($permissions as $resource => $actions) {
            foreach ($actions as $action) {
                Permission::findOrCreate("{$resource}.{$action}", 'web');
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
