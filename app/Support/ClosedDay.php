<?php

namespace App\Support;

use App\Models\ZReport;
use Illuminate\Validation\ValidationException;

/** A business date with a Z report is closed: it takes no new orders, payments, refunds or shifts. */
class ClosedDay
{
    public static function isClosed(string $businessDate): bool
    {
        return ZReport::where('business_date', $businessDate)->exists();
    }

    public static function assertOpen(string $businessDate, string $field = 'business_date'): void
    {
        if (self::isClosed($businessDate)) {
            throw ValidationException::withMessages([
                $field => "The business day {$businessDate} is closed (Z report issued). Nothing more can be recorded on it.",
            ]);
        }
    }
}
