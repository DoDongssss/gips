<?php

namespace App\Http\Requests\Kiosk;

use App\Http\Requests\Orders\PriceOrderRequest;

/** Kiosk cart pricing preview — same shape as placing an order, without a session id. */
class KioskPriceOrderRequest extends PriceOrderRequest
{
    public function rules(): array
    {
        $rules = array_filter(
            parent::rules(),
            fn ($rule, $key) => ! str_starts_with($key, 'discounts') && ! str_starts_with($key, 'approval') && ! str_contains($key, 'price_override'),
            ARRAY_FILTER_USE_BOTH,
        );

        return $rules + [
            'senior_pwd' => ['sometimes', 'boolean'],
        ];
    }
}
