<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Foundation\Events\Dispatchable;

/** Phase 6 listens: DeductStockForOrder. */
class OrderPaid
{
    use Dispatchable;

    public function __construct(public Order $order) {}
}
