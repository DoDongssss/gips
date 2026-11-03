<?php

namespace App\Services\Orders;

use App\Models\OrderNumberSequence;
use App\Support\PosSettings;
use Illuminate\Support\Facades\DB;

class OrderNumberService
{
    /**
     * Next pickup number for a business date, e.g. "A-023".
     * The day's row is locked while the counter moves, so parallel requests never share a number.
     * Must run inside the order-creation transaction.
     */
    public function next(string $businessDate): string
    {
        DB::table('order_number_sequences')->insertOrIgnore([
            'business_date' => $businessDate,
            'last_number' => 0,
            'prefix' => substr((string) PosSettings::get('orders', 'pickup_prefix', 'A'), 0, 4),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $sequence = OrderNumberSequence::where('business_date', $businessDate)->lockForUpdate()->firstOrFail();
        $sequence->increment('last_number');

        $number = str_pad((string) $sequence->last_number, 3, '0', STR_PAD_LEFT);

        return $sequence->prefix === '' ? $number : "{$sequence->prefix}-{$number}";
    }
}
