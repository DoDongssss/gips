<?php

return [
    // Cannot be edited or deleted from the screen. Super-admin always keeps every permission.
    'locked_roles' => ['superadmin'],

    // Ship with the system: permissions can be changed, but they cannot be renamed or deleted.
    'built_in_roles' => ['superadmin', 'owner', 'manager', 'cashier', 'barista'],

    // Permissions a role must always keep, so nobody can lock the business out of this screen.
    'required_permissions' => [
        'owner' => ['role.manage'],
    ],
];
