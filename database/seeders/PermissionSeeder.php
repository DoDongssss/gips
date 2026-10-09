<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'user'      => ['view', 'create', 'update', 'delete', 'reset-credentials'],
            'menu'      => ['view', 'create', 'update', 'delete'],
            'order'     => ['view', 'create', 'update', 'void'],
            'discount'  => ['apply', 'manage'],
            'payment'   => ['take', 'refund'],
            'kds'       => ['view', 'bump'],
            'shift'     => ['open', 'close', 'view-all'],
            'inventory' => ['view', 'adjust', 'count', 'receive'],
            'report'    => ['view', 'export'],
            'role'      => ['manage'],
            'setting'   => ['view', 'update'],
            'device'    => ['manage'],
        ];

        foreach ($permissions as $resource => $actions) {
            foreach ($actions as $action) {
                Permission::findOrCreate("{$resource}.{$action}", 'web');
            }
        }
    }
}