<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * One push for everything that changed together. It only says which kinds changed ("devices", "printers", "stock")
 * and their counts; the screens fetch the details themselves, so no names travel through Pusher.
 *
 * Channels keep the permissions apart: device-alerts (device.manage) for devices and printers,
 * stock-alerts (inventory.view) for stock. One publish goes to every channel that is needed.
 */
class AlertsChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    /** @param  array<string, int>  $counts  kind => how many right now */
    public function __construct(public array $counts) {}

    /** @return array<int, PrivateChannel> */
    public function broadcastOn(): array
    {
        $kinds = array_keys($this->counts);
        $channels = [];

        if (array_intersect($kinds, ['devices', 'printers'])) {
            $channels[] = new PrivateChannel('device-alerts');
        }
        if (in_array('stock', $kinds, true)) {
            $channels[] = new PrivateChannel('stock-alerts');
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'changed';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return ['kinds' => array_keys($this->counts), 'counts' => $this->counts];
    }
}
