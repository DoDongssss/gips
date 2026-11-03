<?php

namespace App\Events;

use App\Models\Order;
use App\Support\Realtime;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/** An order changed status. The cashier's ready board refetches on this. */
class OrderBoardUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public int $orderId, public string $status) {}

    public static function publish(Order $order): void
    {
        if (! Realtime::enabled()) {
            return;
        }

        try {
            event(new self($order->id, $order->status->value));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /** @return array<int, PrivateChannel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('pos.orders')];
    }

    public function broadcastAs(): string
    {
        return 'order.updated';
    }

    /** @return array<string, int|string> */
    public function broadcastWith(): array
    {
        return ['order_id' => $this->orderId, 'status' => $this->status];
    }
}
