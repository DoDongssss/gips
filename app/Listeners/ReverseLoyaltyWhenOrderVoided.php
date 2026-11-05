<?php

namespace App\Listeners;

use App\Enums\OrderStatus;
use App\Events\OrderStatusChanged;
use App\Services\Customers\LoyaltyService;

class ReverseLoyaltyWhenOrderVoided
{
    public function __construct(private LoyaltyService $loyalty) {}

    public function handle(OrderStatusChanged $event): void
    {
        if ($event->to !== OrderStatus::Voided) {
            return;
        }

        $this->loyalty->reverseForVoidedOrder($event->order);
    }
}
