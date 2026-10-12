<?php

namespace App\Support;

use Carbon\CarbonInterface;

/** A store day can run past midnight: before the cut-off hour we are still on "yesterday". */
class BusinessDate
{
    public static function current(?CarbonInterface $at = null): string
    {
        $at = ($at ?? now())->copy();
        $cutoff = (int) PosSettings::get('orders', 'business_day_cutoff_hour', 4);

        if ($at->hour < $cutoff) {
            $at = $at->subDay();
        }

        return $at->toDateString();
    }
}
