<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Foundation\Events\Dispatchable;

/** Phase 4 listens: CreateKdsTickets splits the lines by station. */
class OrderConfirmed
{
    use Dispatchable;

    public function __construct(public Order $order) {}
}
