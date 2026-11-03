<?php

namespace Database\Seeders\System;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/** Roles and the permissions each one holds. Runs after PermissionSeeder. Re-running re-syncs every role to the lists below. */
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $roles = [
            // Every permission. PermissionSeeder must run first.
            'owner' => Permission::pluck('name')->all(),
            'superadmin' => Permission::pluck('name')->all(),

            // Everything operational. No user create/update/delete, credential resets,
            // role management, setting updates, audit log or devices (owner only).
            'manager' => [
                'menu.view', 'menu.create', 'menu.update', 'menu.delete', 'menu.availability',
                'order.view', 'order.create', 'order.update', 'order.void',
                'discount.apply', 'discount.manage',
                'payment.take', 'payment.refund',
                'kds.view', 'kds.bump',
                'shift.open', 'shift.close', 'shift.view-all',
                'inventory.view', 'inventory.adjust', 'inventory.count', 'inventory.receive',
                'recipe.manage', 'supplier.manage', 'purchase.manage',
                'report.view', 'report.export',
                'user.view', 'setting.view',
            ],

            'cashier' => [
                'menu.view', 'menu.availability',
                'order.view', 'order.create', 'order.update',
                'discount.apply',
                'payment.take',
                'shift.open', 'shift.close',
            ],

            // Kitchen staff: the kitchen screens only.
            'kitchen' => [
                'kds.view', 'kds.bump',
            ],

            'barista' => [
                'menu.view',
                'order.view',
                'kds.view', 'kds.bump',
            ],
        ];

        foreach ($roles as $name => $permissions) {
            Role::findOrCreate($name, 'web')->syncPermissions($permissions);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
