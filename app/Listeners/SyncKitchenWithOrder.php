<?php

namespace App\Listeners;

use App\Enums\OrderStatus;
use App\Events\OrderBoardUpdated;
use App\Events\OrderStatusChanged;
use App\Services\Kitchen\KdsService;

/** Cancelled and voided orders leave the kitchen screens; every change refreshes the cashier board. */
class SyncKitchenWithOrder
{
    public function __construct(private KdsService $kds) {}

    public function handle(OrderStatusChanged $event): void
    {
        if (in_array($event->to, [OrderStatus::Cancelled, OrderStatus::Voided], true)) {
            $this->kds->cancelForOrder($event->order);
        }

        OrderBoardUpdated::publish($event->order);
    }
}
