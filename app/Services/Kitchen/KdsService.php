<?php

namespace App\Services\Kitchen;

use App\Enums\KdsTicketStatus;
use App\Enums\OrderItemStatus;
use App\Enums\OrderStatus;
use App\Events\KdsTicketUpdated;
use App\Models\Device;
use App\Models\KdsTicket;
use App\Models\KdsTicketItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Station;
use App\Models\User;
use App\Services\Orders\OrderStatusService;
use App\Support\PosSettings;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Kitchen display tickets. Splits a confirmed order by station, lets staff start, bump and
 * recall, and marks the order ready when every ticket is bumped.
 */
class KdsService
{
    public function __construct(private OrderStatusService $statuses) {}

    /**
     * Split the order's lines by station into one ticket per station.
     * Safe to call twice: an order that already has tickets is left alone.
     *
     * @return Collection<int, KdsTicket>
     */
    public function createTickets(Order $order): Collection
    {
        $tickets = DB::transaction(function () use ($order) {
            $order = Order::query()->lockForUpdate()->findOrFail($order->id);

            if ($order->status->isTerminal() || KdsTicket::where('order_id', $order->id)->exists()) {
                return collect();
            }

            $items = $order->items()->with('modifiers')->where('status', '!=', OrderItemStatus::Voided->value)->get();
            $stationByItem = $this->resolveStations($items);

            return $items->groupBy(fn (OrderItem $item) => $stationByItem[$item->id] ?? 0)
                ->reject(fn ($group, $stationId) => $stationId === 0)
                ->map(function (Collection $group, int $stationId) use ($order) {
                    Station::query()->lockForUpdate()->findOrFail($stationId);

                    $ticket = KdsTicket::create([
                        'order_id' => $order->id,
                        'station_id' => $stationId,
                        'ticket_number' => $this->nextTicketNumber($stationId, $order),
                        'status' => KdsTicketStatus::New->value,
                        'fired_at' => now(),
                    ]);

                    foreach ($group as $item) {
                        $ticket->items()->create([
                            'order_item_id' => $item->id,
                            'name' => $item->variant_name ? "{$item->product_name} ({$item->variant_name})" : $item->product_name,
                            'quantity' => $item->quantity,
                            'modifiers_summary' => $item->modifiers->map(
                                fn ($m) => $m->quantity > 1 ? "{$m->modifier_name} x{$m->quantity}" : $m->modifier_name,
                            )->implode(', ') ?: null,
                            'notes' => $item->notes,
                        ]);
                        $item->update(['station_id' => $stationId, 'status' => OrderItemStatus::Sent->value]);
                    }

                    return $ticket;
                })
                ->values();
        });

        $tickets->each(fn (KdsTicket $ticket) => KdsTicketUpdated::publish($ticket, 'created'));

        return $tickets;
    }

    /** New to preparing. Also moves the order from confirmed to preparing. */
    public function start(KdsTicket $ticket, User|Device $actor): KdsTicket
    {
        $ticket = DB::transaction(function () use ($ticket) {
            $ticket = KdsTicket::query()->lockForUpdate()->findOrFail($ticket->id);

            if ($ticket->status === KdsTicketStatus::New) {
                $ticket->update(['status' => KdsTicketStatus::Preparing->value, 'started_at' => now()]);
                $ticket->items()->where('status', 'new')->update(['status' => 'preparing']);
            }

            return $ticket;
        });

        $this->markOrderPreparing($ticket->order_id, $actor);
        KdsTicketUpdated::publish($ticket, 'started');

        return $ticket;
    }

    /** One item done. When it is the last one, the ticket is bumped too. */
    public function bumpItem(KdsTicketItem $item, User|Device $actor): KdsTicket
    {
        $ticket = DB::transaction(function () use ($item, $actor) {
            $ticket = KdsTicket::query()->lockForUpdate()->findOrFail($item->kds_ticket_id);
            $this->ensureOpen($ticket);

            $item = KdsTicketItem::query()->findOrFail($item->id);
            if ($item->status !== 'bumped') {
                $item->update(['status' => 'bumped', 'ready_at' => now()]);
                OrderItem::whereKey($item->order_item_id)->update(['status' => OrderItemStatus::Ready->value]);
            }

            if ($ticket->status === KdsTicketStatus::New) {
                $ticket->update(['status' => KdsTicketStatus::Preparing->value, 'started_at' => now()]);
            }

            if (! $ticket->items()->where('status', '!=', 'bumped')->exists()) {
                $this->finish($ticket, $actor);
            }

            return $ticket->refresh();
        });

        $this->afterBump($ticket, $actor);

        return $ticket;
    }

    /** Every item on the ticket done. */
    public function bumpTicket(KdsTicket $ticket, User|Device $actor): KdsTicket
    {
        $ticket = DB::transaction(function () use ($ticket, $actor) {
            $ticket = KdsTicket::query()->lockForUpdate()->findOrFail($ticket->id);
            $this->ensureOpen($ticket);

            $itemIds = $ticket->items()->where('status', '!=', 'bumped')->pluck('order_item_id');
            $ticket->items()->where('status', '!=', 'bumped')->update(['status' => 'bumped', 'ready_at' => now()]);
            OrderItem::whereIn('id', $itemIds)->update(['status' => OrderItemStatus::Ready->value]);

            $this->finish($ticket, $actor);

            return $ticket->refresh();
        });

        $this->afterBump($ticket, $actor);

        return $ticket;
    }

    /** Undo the most recent bump at a station. */
    public function recall(Station $station, User|Device $actor): KdsTicket
    {
        $ticket = DB::transaction(function () use ($station) {
            $ticket = KdsTicket::query()
                ->where('station_id', $station->id)
                ->where('status', KdsTicketStatus::Bumped->value)
                ->whereHas('order', fn ($q) => $q->whereIn('status', [OrderStatus::Ready->value, OrderStatus::Preparing->value, OrderStatus::Confirmed->value]))
                ->orderByDesc('bumped_at')
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            if (! $ticket) {
                throw ValidationException::withMessages(['ticket' => 'There is no bumped ticket to recall.']);
            }

            $ticket->update(['status' => KdsTicketStatus::Preparing->value, 'bumped_at' => null, 'bumped_by' => null, 'ready_at' => null]);
            $itemIds = $ticket->items()->pluck('order_item_id');
            $ticket->items()->update(['status' => 'preparing', 'ready_at' => null]);
            OrderItem::whereIn('id', $itemIds)->update(['status' => OrderItemStatus::Preparing->value]);

            return $ticket;
        });

        $order = Order::findOrFail($ticket->order_id);
        if ($order->status === OrderStatus::Ready) {
            $this->statuses->transition($order, OrderStatus::Preparing, $this->userOf($actor), 'Recalled by the kitchen', $this->deviceIdOf($actor));
        }

        KdsTicketUpdated::publish($ticket, 'recalled');

        return $ticket;
    }

    /** The order was cancelled or voided: its tickets leave every screen. */
    public function cancelForOrder(Order $order): void
    {
        $tickets = KdsTicket::query()
            ->where('order_id', $order->id)
            ->whereIn('status', [KdsTicketStatus::New->value, KdsTicketStatus::Preparing->value, KdsTicketStatus::Ready->value])
            ->get();

        foreach ($tickets as $ticket) {
            $ticket->update(['status' => KdsTicketStatus::Cancelled->value]);
            KdsTicketUpdated::publish($ticket, 'cancelled');
        }
    }

    private function finish(KdsTicket $ticket, User|Device $actor): void
    {
        $ticket->update([
            'status' => KdsTicketStatus::Bumped->value,
            'ready_at' => now(),
            'bumped_at' => now(),
            'bumped_by' => $this->userOf($actor)?->id,
        ]);
    }

    private function afterBump(KdsTicket $ticket, User|Device $actor): void
    {
        if ($ticket->status === KdsTicketStatus::Bumped) {
            $this->rollUp($ticket->order_id, $actor);
        } else {
            $this->markOrderPreparing($ticket->order_id, $actor);
        }

        KdsTicketUpdated::publish($ticket, 'bumped');
    }

    /** The order becomes ready when every ticket is bumped. */
    private function rollUp(int $orderId, User|Device $actor): void
    {
        $stillOpen = KdsTicket::where('order_id', $orderId)
            ->whereIn('status', [KdsTicketStatus::New->value, KdsTicketStatus::Preparing->value, KdsTicketStatus::Ready->value])
            ->exists();

        if ($stillOpen) {
            return;
        }

        $order = Order::findOrFail($orderId);
        if ($order->status->canTransitionTo(OrderStatus::Ready)) {
            $this->statuses->transition($order, OrderStatus::Ready, $this->userOf($actor), 'All kitchen tickets bumped', $this->deviceIdOf($actor));
        }
    }

    private function markOrderPreparing(int $orderId, User|Device $actor): void
    {
        $order = Order::findOrFail($orderId);
        if ($order->status === OrderStatus::Confirmed) {
            $this->statuses->transition($order, OrderStatus::Preparing, $this->userOf($actor), deviceId: $this->deviceIdOf($actor));
        }
    }

    private function userOf(User|Device $actor): ?User
    {
        return $actor instanceof User ? $actor : null;
    }

    private function deviceIdOf(User|Device $actor): ?int
    {
        return $actor instanceof Device ? $actor->id : null;
    }

    private function ensureOpen(KdsTicket $ticket): void
    {
        if (! $ticket->status->isOpen()) {
            throw ValidationException::withMessages(['ticket' => "This ticket is already {$ticket->status->value}."]);
        }
    }

    /**
     * Station per order line: the product's own station, else its category's station,
     * else the first active station so no line is lost.
     *
     * @param  Collection<int, OrderItem>  $items
     * @return array<int, int> order_item id => station id
     */
    private function resolveStations(Collection $items): array
    {
        $activeIds = Station::active()->pluck('id')->all();
        $fallback = Station::active()->ordered()->value('id');
        $products = Product::query()->whereIn('id', $items->pluck('product_id')->unique())->get(['id', 'category_id', 'station_id'])->keyBy('id');
        $categoryStations = DB::table('category_stations')->pluck('station_id', 'category_id');

        $map = [];
        foreach ($items as $item) {
            $product = $products->get($item->product_id);
            $candidates = [$product?->station_id, $categoryStations[$product?->category_id] ?? null];
            $station = collect($candidates)->first(fn ($id) => $id && in_array($id, $activeIds, true)) ?? $fallback;

            if ($station) {
                $map[$item->id] = (int) $station;
            }
        }

        return $map;
    }

    private function nextTicketNumber(int $stationId, Order $order): int
    {
        $last = KdsTicket::query()
            ->where('station_id', $stationId)
            ->whereHas('order', fn ($q) => $q->where('business_date', $order->business_date->toDateString()))
            ->max('ticket_number');

        return ((int) $last) + 1;
    }

    /**
     * Everything a kitchen screen shows for one station.
     *
     * @return array<string, mixed>
     */
    public function board(Station $station): array
    {
        $open = $this->openStatuses();

        $tickets = $station->tickets()
            ->whereIn('status', $open)
            ->with(['items', 'order:id,order_number,type,customer_name,notes'])
            ->orderBy('priority', 'desc')
            ->orderBy('fired_at')
            ->orderBy('id')
            ->get();

        $canRecall = $station->tickets()
            ->where('status', KdsTicketStatus::Bumped->value)
            ->whereHas('order', fn ($q) => $q->whereIn('status', ['confirmed', 'preparing', 'ready']))
            ->exists();

        return [
            'station' => ['id' => $station->id, 'name' => $station->name, 'type' => $station->type->value],
            'thresholds' => [
                'warning_minutes' => (int) PosSettings::get('kitchen', 'warning_minutes', 5),
                'late_minutes' => (int) PosSettings::get('kitchen', 'late_minutes', 10),
            ],
            'server_time' => now()->toIso8601String(),
            'can_recall' => $canRecall,
            'tickets' => $tickets->map(fn (KdsTicket $t) => $this->present($t))->values()->all(),
        ];
    }

    /** @return array<string, mixed> */
    public function present(KdsTicket $ticket): array
    {
        $ticket->loadMissing(['items', 'order:id,order_number,type,customer_name,notes']);
        $order = $ticket->order;

        return [
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'status' => $ticket->status->value,
            'priority' => $ticket->priority,
            'fired_at' => $ticket->fired_at?->toIso8601String(),
            'order' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'type' => $order->type->value,
                'customer_name' => $order->customer_name,
                'notes' => $order->notes,
            ],
            'items' => $ticket->items->map(fn (KdsTicketItem $i) => [
                'id' => $i->id,
                'name' => $i->name,
                'quantity' => $i->quantity,
                'modifiers_summary' => $i->modifiers_summary,
                'notes' => $i->notes,
                'status' => $i->status,
            ])->values()->all(),
        ];
    }

    /** @return array<int, string> */
    private function openStatuses(): array
    {
        return [KdsTicketStatus::New->value, KdsTicketStatus::Preparing->value, KdsTicketStatus::Ready->value];
    }
}
