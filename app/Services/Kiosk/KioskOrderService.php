<?php

namespace App\Services\Kiosk;

use App\Enums\OrderChannel;
use App\Models\Device;
use App\Models\KioskSession;
use App\Models\Order;
use App\Services\Orders\OrderService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;

class KioskOrderService
{
    public function __construct(private OrderService $orders, private KioskActor $actor) {}

    /**
     * Place the customer's order. Pay at counter: the order is created OPEN and unpaid with a pickup number.
     * Paying it at the counter confirms it and sends it to the kitchen (PaymentService already does that).
     *
     * Idempotent: one kiosk session makes one order. The session row is locked, so a retry or a double tap
     * gets the same order back instead of a second one.
     *
     * @param  array<string, mixed>  $cart  validated cart (type, items, customer_name, notes)
     * @return array{0: Order, 1: bool}  the order, and whether it was just created
     */
    public function place(Device $device, string $sessionUuid, array $cart, bool $seniorPwd): array
    {
        $this->assertInService($device);

        return DB::transaction(function () use ($device, $sessionUuid, $cart, $seniorPwd) {
            $session = KioskSession::query()->where('device_id', $device->id)->where('uuid', $sessionUuid)->lockForUpdate()->firstOrFail();

            if ($session->order_id !== null) {
                return [$this->orders->load(Order::findOrFail($session->order_id)), false];
            }

            if ($session->status !== KioskSession::ACTIVE) {
                $this->refuse('session_ended', 'This session has ended. Please start again.', 409);
            }

            $order = $this->orders->create($cart, $this->actor->user(), OrderChannel::Kiosk, $device->id, confirm: false);

            // A senior or PWD customer cannot be discounted at the kiosk. The order is flagged until staff see the ID.
            if ($seniorPwd) {
                DB::table('orders')->where('id', $order->id)->update(['requires_verification' => true]);
                $order->requires_verification = true;
            }

            $session->update([
                'order_id' => $order->id, 'status' => 'completed', 'ended_at' => now(),
                'items_count' => (int) $order->items->sum('quantity'),
            ]);

            return [$order, true];
        });
    }

    public function assertInService(Device $device): void
    {
        if ($device->freshSettings()?->is_out_of_service) {
            $this->refuse('out_of_service', 'This kiosk is out of service.', 423);
        }
    }

    private function refuse(string $code, string $message, int $status): never
    {
        throw new HttpResponseException(response()->json(['code' => $code, 'message' => $message], $status));
    }
}