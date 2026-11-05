<?php

namespace App\Support;

use App\Services\Configuration\ConfigurationService;
use Carbon\CarbonInterface;

/** A store day can run past midnight: before the cut-off hour we are still on "yesterday". */
class BusinessDate
{
    public static function current(?CarbonInterface $at = null): string
    {
        $at = ($at ?? now())->copy();
        $cutoff = (int) app(ConfigurationService::class)->get('orders_cutoff_hour');

        if ($at->hour < $cutoff) {
            $at = $at->subDay();
        }

        return $at->toDateString();
    }
}
