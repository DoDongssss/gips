<?php

namespace App\Support;

use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;

/** Every permission in the database, grouped and described for the Roles & permissions screen. */
class PermissionCatalog
{
    /** @return array<int, array{key:string,label:string,permissions:array<int, array{name:string,label:string,description:?string}>}> */
    public static function groups(): array
    {
        $labels = config('permission-catalog.groups', []);
        $descriptions = config('permission-catalog.descriptions', []);

        return Permission::query()->where('guard_name', 'web')->orderBy('name')->pluck('name')
            ->groupBy(fn (string $name) => Str::before($name, '.'))
            ->map(fn ($names, string $key) => [
                'key' => $key,
                'label' => $labels[$key] ?? Str::headline($key),
                'permissions' => $names->map(fn (string $name) => [
                    'name' => $name,
                    'label' => Str::headline(str_replace(['-', '.'], ' ', Str::after($name, '.'))),
                    'description' => $descriptions[$name] ?? null,
                ])->values()->all(),
            ])
            // Known groups first, in the order of the catalog; anything new at the end.
            ->sortBy(fn (array $g) => ($i = array_search($g['key'], array_keys($labels), true)) === false ? PHP_INT_MAX : $i)
            ->values()->all();
    }
}
