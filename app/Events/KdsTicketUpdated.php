<?php

namespace App\Events;

use App\Models\KdsTicket;
use App\Support\Realtime;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/** A ticket was created, started, bumped, recalled or cancelled. Screens refetch on this. */
class KdsTicketUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public int $ticketId, public int $stationId, public int $orderId, public string $action) {}

    /** Broadcasting is optional until Reverb is installed; the screens poll as a fallback. */
    public static function publish(KdsTicket $ticket, string $action): void
    {
        if (! Realtime::enabled()) {
            return;
        }

        try {
            event(new self($ticket->id, $ticket->station_id, $ticket->order_id, $action));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /** @return array<int, PrivateChannel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('kds.station.'.$this->stationId)];
    }

    public function broadcastAs(): string
    {
        return 'ticket.updated';
    }

    /** @return array<string, int|string> */
    public function broadcastWith(): array
    {
        return ['ticket_id' => $this->ticketId, 'order_id' => $this->orderId, 'action' => $this->action];
    }
}
