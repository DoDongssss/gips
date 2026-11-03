<?php

namespace App\Http\Requests\Orders;

class StoreOrderRequest extends PriceOrderRequest
{
    // Same cart as the preview. The Idempotency-Key header is checked by middleware.
}
