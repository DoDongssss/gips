<?php

namespace App\Services\Orders;

use App\Enums\OrderItemStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Events\OrderConfirmed;
use App\Events\OrderStatusChanged;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The only place an order's status changes. Invalid jumps are rejected.
 * Voiding a paid order is finished by RefundService::refundAllForVoid(), which hands the money back.
 */
class OrderStatusService
{
    public function transition(
        Order $order,
        OrderStatus $to,
        ?User $user = null,
        ?string $note = null,
        ?int $deviceId = null,
    ): Order {
        return DB::transaction(function () use ($order, $to, $user, $note, $deviceId) {
            $order = Order::query()->lockForUpdate()->findOrFail($order->id);
            $from = $order->status;

            if ($from === $to) {
                return $order; // repeating the same action is harmless
            }

            if (! $from->canTransitionTo($to)) {
                throw ValidationException::withMessages([
                    'status' => "An order that is {$from->value} cannot become {$to->value}.",
                ]);
            }

            if ($to === OrderStatus::Cancelled && $order->paid_cents > 0) {
                throw ValidationException::withMessages(['status' => 'A paid order cannot be cancelled. Void it instead.']);
            }

            if ($to === OrderStatus::Completed && $order->payment_status !== PaymentStatus::Paid && $order->total_cents > 0) {
                throw ValidationException::withMessages(['status' => 'Take payment before completing the order.']);
            }

            $changes = ['status' => $to];
            match ($to) {
                OrderStatus::Confirmed => $changes['confirmed_at'] = now(),
                OrderStatus::Completed => $changes['completed_at'] = now(),
                OrderStatus::Cancelled => $changes += ['cancelled_at' => now(), 'cancel_reason' => $note],
                default => null,
            };
            $order->update($changes);

            if (in_array($to, [OrderStatus::Cancelled, OrderStatus::Voided], true)) {
                $order->items()->update([
                    'status' => OrderItemStatus::Voided->value,
                    'voided_by' => $user?->id,
                    'voided_at' => now(),
                    'void_reason' => $note,
                ]);
            }

            $order->statusHistory()->create([
                'from_status' => $from->value,
                'to_status' => $to->value,
                'user_id' => $user?->id,
                'device_id' => $deviceId,
                'note' => $note,
            ]);

            DB::afterCommit(function () use ($order, $from, $to) {
                event(new OrderStatusChanged($order, $from, $to));
                if ($to === OrderStatus::Confirmed) {
                    event(new OrderConfirmed($order));
                }
            });

            return $order;
        });
    }
}
