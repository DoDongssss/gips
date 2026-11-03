<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Collection;

/** Managers who can approve a sensitive action at the till with their PIN. */
class Approvers
{
    /**
     * Active staff with a PIN set who hold at least one of the permissions.
     * The server still checks the PIN and the permission when the approval is used.
     *
     * @param  array<int, string>  $permissions
     * @return Collection<int, array{id: int, name: string}>
     */
    public static function for(array $permissions): Collection
    {
        return User::query()
            ->where('is_active', true)
            ->whereNotNull('pin')
            ->orderBy('name')
            ->get()
            ->filter(fn (User $user) => collect($permissions)->contains(fn (string $permission) => $user->can($permission)))
            ->map(fn (User $user) => ['id' => $user->id, 'name' => $user->name])
            ->values();
    }
}
