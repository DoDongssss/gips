<?php

namespace App\Listeners;

use App\Events\OrderPaid;
use App\Services\Customers\LoyaltyService;

class AwardLoyaltyWhenOrderPaid
{
    public function __construct(private LoyaltyService $loyalty) {}

    public function handle(OrderPaid $event): void
    {
        $this->loyalty->processPaidOrder($event->order);
    }
}
