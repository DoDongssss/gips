<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use App\Support\Realtime;

/**
 * "An order changed, look again." Carries nothing about the order: the register fetches its own lists
 * (ready orders, kiosk orders waiting at the counter, my orders). Only staff with order.view may listen.
 */
class PosOrdersChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    /** True while a push for this request is already waiting to be sent. */
    private static bool $queued = false;

    /**
     * Tell the registers to look again, once, after the response is sent: call it as often as you like during a request.
     * Never fails the request if Pusher is down.
     */
    public static function queue(): void
    {
        if (self::$queued || ! Realtime::enabled()) {
            return;
        }

        self::$queued = true;

        defer(function () {
            self::$queued = false;

            try {
                event(new self);
            } catch (\Throwable $e) {
                report($e);
            }
        });
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

    /** @return array<string, int> */
    public function broadcastWith(): array
    {
        return ['at' => now()->getTimestamp()];
    }
}
