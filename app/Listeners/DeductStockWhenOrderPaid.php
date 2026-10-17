<?php

namespace App\Listeners;

use App\Events\OrderPaid;
use App\Jobs\DeductStockForOrder;

/** Deducts ingredient stock the moment an order is fully paid. */
class DeductStockWhenOrderPaid
{
    public function handle(OrderPaid $event): void
    {
        try {
            DeductStockForOrder::dispatch($event->order->id);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}