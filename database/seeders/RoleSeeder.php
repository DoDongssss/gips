<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $roles = [
            'owner' => Permission::pluck('name')->all(),
            'superadmin' => Permission::pluck('name')->all(),


            'manager' => [
                'menu.view', 'menu.create', 'menu.update', 'menu.delete',
                'order.view', 'order.create', 'order.update', 'order.void',
                'discount.apply', 'discount.manage',
                'payment.take', 'payment.refund',
                'kds.view', 'kds.bump',
                'shift.open', 'shift.close', 'shift.view-all',
                'inventory.view', 'inventory.adjust', 'inventory.count', 'inventory.receive',
                'report.view', 'report.export',
                'user.view', 'setting.view',
            ],

            'cashier' => [
                'menu.view',
                'order.view', 'order.create', 'order.update',
                'discount.apply',
                'payment.take',
                'shift.open', 'shift.close',
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
    }
}