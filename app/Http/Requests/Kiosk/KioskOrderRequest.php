<?php

namespace App\Http\Requests\Kiosk;

use App\Http\Requests\Orders\PriceOrderRequest;

/**
 * The kiosk cart: the same rules as the register, minus everything a customer must never send
 * (discounts, manager approval, price overrides), plus the session it belongs to.
 */
class KioskOrderRequest extends PriceOrderRequest
{
    public function rules(): array
    {
        $rules = array_filter(
            parent::rules(),
            fn ($rule, $key) => ! str_starts_with($key, 'discounts') && ! str_starts_with($key, 'approval') && ! str_contains($key, 'price_override'),
            ARRAY_FILTER_USE_BOTH,
        );

        return $rules + [
            'session_uuid' => ['required', 'uuid'],
            'senior_pwd' => ['sometimes', 'boolean'], // "I am a senior citizen or PWD": flags the order for ID check
        ];
    }
}
