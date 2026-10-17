<?php

namespace App\Support;

/**
 * Stock quantities are decimal(14,4). This server has no bcmath, so every calculation
 * is rounded back to four places immediately, which keeps 1.5 kg = 1500 g exact.
 */
final class Qty
{
    public static function round(float|int|string|null $value): float
    {
        return round((float) $value, 4);
    }

    /** A value ready to store in a decimal(14,4) column. */
    public static function fmt(float|int|string|null $value): string
    {
        return number_format(self::round($value), 4, '.', '');
    }
}
