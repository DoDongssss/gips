<?php

namespace App\Support;

/** Stored configuration values are text. Booleans are '1' and '0'. */
final class ConfigValue
{
    public static function stringify(mixed $value): ?string
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
