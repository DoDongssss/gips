<?php

namespace App\Services;

use App\Models\Configuration;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Reads and writes store configurations.
 *
 * Usage anywhere in the app:
 *   app(ConfigurationsService::class)->get('tax_default_rate');   // 12.0
 *   app(ConfigurationsService::class)->get('shifts_require_open_shift'); // true
 *
 * Values are cached, and the cache is cleared whenever a configuration changes.
 * A configuration that has no stored row falls back to its default in config/configurations.php.
 */
class ConfigurationService
{
    private const CACHE_KEY = 'configurations.values';

    /** @return array<string, mixed> every configuration, cast to its type */
    public function all(): array
    {
        $stored = Cache::rememberForever(
            self::CACHE_KEY,
            fn () => Configuration::query()->pluck('value', 'key')->all(),
        );

        $values = [];

        foreach (config('configurations.groups', []) as $group) {
            foreach ($group['fields'] as $key => $field) {
                $raw = array_key_exists($key, $stored) ? $stored[$key] : $field['default'];

                $values[$key] = $this->cast($field['type'], $raw);
            }
        }

        return $values;
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return $this->all()[$key] ?? $default;
    }

    /**
     * Save the submitted values for one group.
     *
     * @param  array<string, mixed>  $values
     */
    public function update(string $group, array $values, ?User $by = null): void
    {
        $fields = config("configurations.groups.{$group}.fields", []);

        DB::transaction(function () use ($group, $fields, $values, $by) {
            foreach ($fields as $key => $field) {
                if (! array_key_exists($key, $values)) {
                    continue;
                }

                Configuration::updateOrCreate(
                    ['key' => $key],
                    [
                        'value' => $this->stringify($values[$key]),
                        'group' => $group,
                        'type' => $field['type'],
                        'updated_by' => $by?->id,
                    ],
                );
            }
        });

        $this->flush();
    }

    public function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    private function cast(string $type, mixed $value): mixed
    {
        if ($value === null) {
            return $type === 'bool' ? false : null;
        }

        return match ($type) {
            'bool' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'int' => (int) $value,
            'decimal' => (float) $value,
            default => (string) $value,
        };
    }

    private function stringify(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        return (string) $value;
    }
}