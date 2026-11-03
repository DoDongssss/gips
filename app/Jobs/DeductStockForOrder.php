<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\Inventory\StockDeductionService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Dispatch when an order becomes paid:
 *   DeductStockForOrder::dispatch($order->id)->afterCommit();
 * Running it twice deducts once (unique stock_movements reference).
 */
class DeductStockForOrder implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [10, 60];

    public function __construct(public readonly int $orderId) {}

    public function uniqueId(): string
    {
        return (string) $this->orderId;
    }

    public function handle(StockDeductionService $deduction): void
    {
        $order = Order::query()->find($this->orderId);

        if ($order !== null) {
            $deduction->deductForOrder($order);
        }
    }
}
