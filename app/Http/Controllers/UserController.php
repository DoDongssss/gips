<?php

namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\DB;

class UserController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:user.view', only: ['index']),
            new Middleware('permission:user.create', only: ['store']),
            new Middleware('permission:user.update', only: ['update']),
            new Middleware('permission:user.reset-credentials', only: ['resetCredentials']),
        ];
    }

    public function index(Request $request): Response
    {
        $actor = $request->user();
        $search = $request->string('search')->toString();

        $sortable = ['name', 'email', 'role', 'is_active'];
        $sort = in_array($request->query('sort'), $sortable, true) ? $request->query('sort') : null;
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        return Inertia::render('users/index', [
            'users' => Inertia::optional(fn () => User::query()
                ->with('roles:id,name')
                ->unless(
                    $actor->hasRole('superadmin'),
                    fn ($query) => $query->whereDoesntHave(
                        'roles',
                        fn ($roles) => $roles->where('name', 'superadmin'),
                    ),
                )
                ->when($search !== '', fn ($query) => $query->where(
                    fn ($q) => $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"),
                ))
                ->when($sort === 'role', fn ($query) => $query->orderBy(
                    DB::table('model_has_roles')
                        ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                        ->whereColumn('model_has_roles.model_id', 'users.id')
                        ->where('model_has_roles.model_type', (new User)->getMorphClass())
                        ->select('roles.name')
                        ->limit(1),
                    $direction,
                ))
                ->when(
                    in_array($sort, ['name', 'email', 'is_active'], true),
                    fn ($query) => $query->orderBy($sort, $direction),
                )
                ->when($sort !== 'name', fn ($query) => $query->orderBy('name'))
                ->orderBy('id')
                ->paginate(10)
                ->withQueryString()
                ->through(fn (User $user) => $this->present($user, $actor))
            ),
            'roles' => $this->assignableRoles(),
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $sort ? $direction : null,
            ],
        ]);
    }

    public function store(UserRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'pin' => $data['pin'] ?? null,
            'is_active' => $data['is_active'],
            'email_verified_at' => now(),
        ]);

        $user->syncRoles($data['role']);

        return back()->with('success', "{$user->name} was added.");
    }

    public function update(UserRequest $request, User $user): RedirectResponse
    {
        // Superadmin accounts are protected in UserRequest::authorize().
        $data = $request->validated();
        $isSelf = $user->is($request->user());
        $roleLocked = $isSelf || $user->hasRole('superadmin');

        $attributes = [
            'name' => $data['name'],
            'email' => $data['email'],
            // Nobody can deactivate their own account.
            'is_active' => $isSelf ? true : $data['is_active'],
        ];

        // Blank password / PIN means "keep the current one".
        if (! empty($data['password'])) {
            $attributes['password'] = $data['password'];
        }

        if (! empty($data['pin'])) {
            $attributes['pin'] = $data['pin'];
        }

        $user->update($attributes);

        if (! $roleLocked && ! empty($data['role'])) {
            $user->syncRoles($data['role']);
        }

        return back()->with('success', "{$user->name} was updated.");
    }

    /**
     * Passwords and PINs are stored hashed and can never be read back, so instead of
     * "showing" them we generate a new one and flash it for the next page load only.
     */
    public function resetCredentials(Request $request, User $user): RedirectResponse
    {
        abort_if(
            $user->hasRole('superadmin') && ! $request->user()->hasRole('superadmin'),
            403,
        );

        $type = $request->validate([
            'type' => ['required', 'in:password,pin'],
        ])['type'];

        $value = $type === 'pin'
            ? str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT)
            : Str::password(12, symbols: false);

        $user->update([$type => $value]);

        return back()->with('generated_credential', [
            'user_id' => $user->id,
            'type' => $type,
            'value' => $value,
        ]);
    }

    /** Every role except superadmin, which can never be assigned from the UI. */
    private function assignableRoles(): array
    {
        return Role::query()
            ->where('name', '!=', 'superadmin')
            ->orderBy('name')
            ->pluck('name')
            ->all();
    }

    private function present(User $user, User $actor): array
    {
        $isSelf = $user->is($actor);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->roles->first()?->name,
            'is_active' => $user->is_active,
            'has_pin' => $user->pin !== null,
            'is_self' => $isSelf,
            'role_locked' => $isSelf || $user->hasRole('superadmin'),
        ];
    }
}