<?php

namespace App\Services\Access;

use App\Models\User;
use App\Support\Audit;
use DomainException;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Creates roles and decides what each role can do.
 *
 * Safety rules (each one throws a DomainException the page shows):
 *  - the locked role (superadmin) cannot be changed or deleted
 *  - built-in roles can have their permissions changed, but not be renamed or deleted
 *  - nobody can give a role a permission they do not hold themselves (no raising your own access)
 *  - a role that must keep a permission (owner: role.manage) cannot lose it
 *  - you cannot remove role.manage from the only role that gives it to you
 *  - a role that still has staff on it cannot be deleted
 */
class RoleService
{
    /** @param array{name:string, permissions:array<int,string>} $data */
    public function create(array $data, User $actor): Role
    {
        $permissions = array_values(array_unique($data['permissions']));
        $this->assertCanGrant($actor, $permissions);

        $role = DB::transaction(function () use ($data, $permissions) {
            $role = Role::create(['name' => $data['name'], 'guard_name' => 'web']);
            $role->syncPermissions($permissions);

            return $role;
        });

        $this->flushCache();
        Audit::record('roles', 'role.created', "Role {$role->name} created", $role, ['permissions' => $permissions]);

        return $role;
    }

    /** @param array{name:string, permissions:array<int,string>} $data */
    public function update(Role $role, array $data, User $actor): Role
    {
        $this->assertEditable($role);

        if ($data['name'] !== $role->name && $this->isBuiltIn($role)) {
            throw new DomainException("The {$role->name} role is built in and cannot be renamed.");
        }

        $new = array_values(array_unique($data['permissions']));
        $current = $role->permissions()->pluck('name')->all();
        $added = array_values(array_diff($new, $current));
        $removed = array_values(array_diff($current, $new));

        // Only what is being ADDED must be something the actor holds. Keeping what the role already has is fine.
        $this->assertCanGrant($actor, $added);
        $this->assertKeepsRequired($role, $new);
        $this->assertNotLockingSelfOut($role, $new, $actor);

        $oldName = $role->name;

        DB::transaction(function () use ($role, $data, $new) {
            $role->update(['name' => $data['name']]);
            $role->syncPermissions($new);
        });

        $this->flushCache();
        Audit::record('roles', 'role.updated', "Role {$oldName} updated", $role, ['renamed_to' => $oldName !== $role->name ? $role->name : null, 'added' => $added, 'removed' => $removed]);

        return $role;
    }

    public function delete(Role $role): void
    {
        $this->assertEditable($role);

        if ($this->isBuiltIn($role)) {
            throw new DomainException("The {$role->name} role is built in and cannot be deleted.");
        }

        if ($role->users()->exists()) {
            throw new DomainException("{$role->users()->count()} staff still have the {$role->name} role. Move them to another role first.");
        }

        $name = $role->name;
        $role->delete();

        $this->flushCache();
        Audit::record('roles', 'role.deleted', "Role {$name} deleted");
    }

    public function isLocked(Role $role): bool
    {
        return in_array($role->name, config('access.locked_roles', []), true);
    }

    public function isBuiltIn(Role $role): bool
    {
        return in_array($role->name, config('access.built_in_roles', []), true);
    }

    /** Permission names this person may hand out: all of them for a super-admin, otherwise only their own. */
    public function grantable(User $actor): array
    {
        if ($this->isSuperAdmin($actor)) {
            return \Spatie\Permission\Models\Permission::query()->where('guard_name', 'web')->pluck('name')->all();
        }

        return $actor->getAllPermissions()->pluck('name')->all();
    }

    private function assertEditable(Role $role): void
    {
        if ($this->isLocked($role)) {
            throw new DomainException("The {$role->name} role is locked. It always has every permission.");
        }
    }

    /** @param array<int,string> $permissions */
    private function assertCanGrant(User $actor, array $permissions): void
    {
        $notAllowed = array_values(array_diff($permissions, $this->grantable($actor)));

        if ($notAllowed !== []) {
            throw new DomainException('You cannot give a permission you do not have yourself: '.implode(', ', $notAllowed).'.');
        }
    }

    /** @param array<int,string> $permissions */
    private function assertKeepsRequired(Role $role, array $permissions): void
    {
        $missing = array_values(array_diff(config("access.required_permissions.{$role->name}", []), $permissions));

        if ($missing !== []) {
            throw new DomainException("The {$role->name} role must keep: ".implode(', ', $missing).'.');
        }
    }

    /** @param array<int,string> $permissions */
    private function assertNotLockingSelfOut(Role $role, array $permissions, User $actor): void
    {
        if ($this->isSuperAdmin($actor) || in_array('role.manage', $permissions, true) || ! $actor->hasRole($role->name)) {
            return;
        }

        $elsewhere = $actor->roles->where('id', '!=', $role->id)->flatMap(fn (Role $r) => $r->permissions->pluck('name'))
            ->merge($actor->getDirectPermissions()->pluck('name'))
            ->contains('role.manage');

        if (! $elsewhere) {
            throw new DomainException('You would lose access to this screen. Keep role.manage on this role, or ask an owner to change it.');
        }
    }

    private function isSuperAdmin(User $actor): bool
    {
        return $actor->hasAnyRole(config('access.locked_roles', []));
    }

    private function flushCache(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
