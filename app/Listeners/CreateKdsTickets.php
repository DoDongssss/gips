<?php

namespace App\Listeners;

use App\Events\OrderConfirmed;
use App\Services\Kitchen\KdsService;

/** A confirmed order is split by station into kitchen tickets. */
class CreateKdsTickets
{
    public function __construct(private KdsService $kds) {}

    public function handle(OrderConfirmed $event): void
    {
        try {
            $this->kds->createTickets($event->order);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
