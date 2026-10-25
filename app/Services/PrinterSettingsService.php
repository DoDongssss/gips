<?php

namespace App\Services;

use App\Models\Configuration;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/** Reads and writes the receipt printer settings (config/printer.php), cached like ConfigurationService. */
class PrinterSettingsService
{
    private const CACHE_KEY = 'printer.settings';

    /** @return array<string, mixed> every printer setting, cast to its type */
    public function all(): array
    {
        $stored = Cache::rememberForever(self::CACHE_KEY, fn () => Configuration::query()->where('group', 'printer')->pluck('value', 'key')->all());

        $values = [];

        foreach (config('printer.fields') as $key => $field) {
            $values[$key] = $this->cast($field['type'], array_key_exists($key, $stored) ? $stored[$key] : $field['default']);
        }

        return $values;
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array<string, array{from: mixed, to: mixed}> what actually changed
     */
    public function update(array $values, ?User $by = null): array
    {
        $before = $this->all();
        $changes = [];

        DB::transaction(function () use ($values, $by, $before, &$changes) {
            foreach (config('printer.fields') as $key => $field) {
                if (! array_key_exists($key, $values)) {
                    continue;
                }

                Configuration::updateOrCreate(
                    ['key' => $key],
                    ['value' => $this->stringify($values[$key]), 'group' => 'printer', 'type' => $field['type'], 'updated_by' => $by?->id],
                );

                $now = $this->cast($field['type'], $this->stringify($values[$key]));

                if ($now !== $before[$key]) {
                    $changes[$key] = ['from' => $before[$key], 'to' => $now];
                }
            }
        });

        Cache::forget(self::CACHE_KEY);

        return $changes;
    }

    private function cast(string $type, mixed $value): mixed
    {
        if ($value === null) {
            return $type === 'bool' ? false : null;
        }

        return match ($type) {
            'bool' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'int' => (int) $value,
            default => (string) $value,
        };
    }

    private function stringify(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_bool($value) ? ($value ? '1' : '0') : (string) $value;
    }
}
