<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Concerns\ReportsDomainErrors;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\RoleRequest;
use App\Services\Access\RoleService;
use App\Support\PermissionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

/** Settings > Roles & permissions: what each role can do. */
class RoleController extends Controller implements HasMiddleware
{
    use ReportsDomainErrors;

    public static function middleware(): array
    {
        return [new Middleware('permission:role.manage')];
    }

    public function index(Request $request, RoleService $roles): Response
    {
        return Inertia::render('roles/index', [
            'roles' => Role::query()->where('guard_name', 'web')->with('permissions:id,name')->withCount('users')->orderBy('id')->get()
                ->map(fn (Role $r) => [
                    'id' => $r->id,
                    'name' => $r->name,
                    'users_count' => $r->users_count,
                    'permissions' => $r->permissions->pluck('name')->sort()->values()->all(),
                    'is_locked' => $roles->isLocked($r),
                    'is_built_in' => $roles->isBuiltIn($r),
                    'required' => config("access.required_permissions.{$r->name}", []),
                    'can_delete' => ! $roles->isLocked($r) && ! $roles->isBuiltIn($r) && $r->users_count === 0,
                ]),
            'catalog' => PermissionCatalog::groups(),
            // The permissions this person may give out (all of them for a super-admin).
            'grantable' => $roles->grantable($request->user()),
        ]);
    }

    public function store(RoleRequest $request, RoleService $roles): RedirectResponse
    {
        $data = $request->validated();

        return $this->attempt(fn () => $roles->create($data, $request->user()), "Role {$data['name']} created.");
    }

    public function update(RoleRequest $request, Role $role, RoleService $roles): RedirectResponse
    {
        $data = $request->validated();

        return $this->attempt(fn () => $roles->update($role, $data, $request->user()), "Role {$data['name']} saved.");
    }

    public function destroy(Role $role, RoleService $roles): RedirectResponse
    {
        $name = $role->name;

        return $this->attempt(fn () => $roles->delete($role), "Role {$name} deleted.");
    }
}