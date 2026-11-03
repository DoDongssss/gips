<?php

namespace App\Events;

use App\Models\KdsTicket;
use App\Support\Realtime;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Support\Collection;

/**
 * Tickets were created, started, bumped, recalled or cancelled. Screens refetch on this.
 * One event covers every ticket of an order, so an order split over three stations is ONE push,
 * sent to each affected station channel and once to the all-stations channel.
 */
class KdsTicketUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    /**
     * @param  array<int, int>  $ticketIds
     * @param  array<int, int>  $stationIds
     */
    public function __construct(public array $ticketIds, public array $stationIds, public int $orderId, public string $action) {}

    /** Broadcasting is optional; the screens poll as a fallback. */
    public static function publish(KdsTicket $ticket, string $action): void
    {
        self::send([$ticket->id], [$ticket->station_id], $ticket->order_id, $action);
    }

    /**
     * One push for a group of tickets (normally the tickets of one order).
     *
     * @param  Collection<int, KdsTicket>  $tickets
     */
    public static function publishMany(Collection $tickets, string $action): void
    {
        if ($tickets->isEmpty()) {
            return;
        }

        self::send($tickets->pluck('id')->all(), $tickets->pluck('station_id')->unique()->values()->all(), (int) $tickets->first()->order_id, $action);
    }

    /**
     * @param  array<int, int>  $ticketIds
     * @param  array<int, int>  $stationIds
     */
    private static function send(array $ticketIds, array $stationIds, int $orderId, string $action): void
    {
        if (! Realtime::enabled()) {
            return;
        }

        try {
            event(new self($ticketIds, $stationIds, $orderId, $action));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /** @return array<int, PrivateChannel> */
    public function broadcastOn(): array
    {
        return [
            ...array_map(fn (int $id) => new PrivateChannel('kds.station.'.$id), array_values(array_unique($this->stationIds))),
            new PrivateChannel('kds.all'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ticket.updated';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return ['ticket_ids' => $this->ticketIds, 'order_id' => $this->orderId, 'action' => $this->action];
    }
}
