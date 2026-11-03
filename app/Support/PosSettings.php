<?php

namespace App\Support;

use App\Models\Configuration;

/**
 * Reads a value from your Phase 1 settings table (App\Models\Configuration).
 * It tries "group.name", "group_name", and (group = group, key = name), because
 * I could not see how your seeded keys are named. If you have a SettingsService,
 * replace the body of get() with a call to it. This is the only place to change.
 */
class PosSettings
{
    public static function get(string $group, string $name, mixed $default = null): mixed
    {
        $row = Configuration::query()
            ->where(fn ($q) => $q->where('key', "{$group}.{$name}")
                ->orWhere('key', "{$group}_{$name}")
                ->orWhere(fn ($w) => $w->where('group', $group)->where('key', $name)))
            ->first();

        if (! $row || $row->value === null || $row->value === '') {
            return $default;
        }

        return match ($row->type) {
            'int' => (int) $row->value,
            'bool' => filter_var($row->value, FILTER_VALIDATE_BOOLEAN),
            'json' => json_decode($row->value, true),
            default => $row->value,
        };
    }
}
