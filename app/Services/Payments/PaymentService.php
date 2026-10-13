<?php

namespace App\Services\Payments;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethodType;
use App\Enums\PaymentRecordStatus;
use App\Enums\PaymentStatus;
use App\Events\OrderPaid;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\User;
use App\Services\Orders\OrderStatusService;
use App\Services\Shifts\ShiftService;
use App\Support\ClosedDay;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    public function __construct(
        private ReceiptService $receipts,
        private OrderStatusService $statuses,
        private ShiftService $shifts,
    ) {}

    /**
     * Take one or more payments (split payments) against an order.
     *  - cash: send tendered_cents; the server applies min(tendered - tip, balance) and works out the change
     *  - other methods: send amount_cents (cannot exceed the balance); a reference number if the method needs one
     * The order row is locked, so two terminals cannot both settle the same order.
     *
     * @param  array<int, array<string, mixed>>  $payments
     */
    public function take(Order $order, array $payments, User $user, ?int $deviceId = null): Order
    {
        $paidNow = false;

        $order = DB::transaction(function () use ($order, $payments, $user, $deviceId, &$paidNow) {
            $order = Order::query()->lockForUpdate()->findOrFail($order->id);

            if (! $order->status->acceptsPayment()) {
                $this->fail('order', "A {$order->status->value} order cannot take payments.");
            }
            if ($order->payment_status === PaymentStatus::Paid || $order->balanceCents() === 0) {
                $this->fail('order', 'This order has nothing left to pay.');
            }

            ClosedDay::assertOpen($order->business_date->toDateString(), 'order');
            $shift = $this->shifts->forMoney($user);

            $methods = PaymentMethod::where('is_active', true)->get()->keyBy('code');
            $outstanding = $order->balanceCents();
            $tipTotal = 0;

            foreach (array_values($payments) as $i => $row) {
                if ($outstanding <= 0) {
                    $this->fail("payments.$i.amount_cents", 'The order is already fully covered.');
                }

                $method = $methods->get($row['method'] ?? '');
                if (! $method) {
                    $this->fail("payments.$i.method", 'That payment method is not available.');
                }

                $tip = (int) ($row['tip_cents'] ?? 0);
                $tendered = null;
                $change = 0;

                if ($method->type === PaymentMethodType::CASH) {
                    $tendered = (int) ($row['tendered_cents'] ?? 0);
                    if ($tendered - $tip <= 0) {
                        $this->fail("payments.$i.tendered_cents", 'Enter the cash received.');
                    }
                    $applied = min($tendered - $tip, $outstanding);
                    $change = $tendered - $applied - $tip;
                } else {
                    $applied = (int) ($row['amount_cents'] ?? 0);
                    if ($applied <= 0) {
                        $this->fail("payments.$i.amount_cents", 'Enter the amount paid.');
                    }
                    if ($applied > $outstanding) {
                        $this->fail("payments.$i.amount_cents", 'The amount is more than the balance due.');
                    }
                    if ($method->requires_reference && blank($row['reference_no'] ?? null)) {
                        $this->fail("payments.$i.reference_no", "{$method->name} needs a reference number.");
                    }
                }

                $payment = $order->payments()->create([
                    'payment_method_id' => $method->id,
                    'amount_cents' => $applied,
                    'tendered_cents' => $tendered,
                    'change_cents' => $change,
                    'tip_cents' => $tip,
                    'status' => PaymentRecordStatus::Completed,
                    'reference_no' => $row['reference_no'] ?? null,
                    'shift_id' => $shift?->id,
                    'device_id' => $deviceId,
                    'received_by' => $user->id,
                    'paid_at' => now(),
                ]);

                if ($method->type !== PaymentMethodType::CASH) {
                    $payment->transactions()->create([
                        'provider' => $method->code,
                        'provider_reference' => $row['reference_no'] ?? null,
                        'status' => 'recorded', // manual reference entry; a real gateway would write here
                    ]);
                }

                $outstanding -= $applied;
                $tipTotal += $tip;
            }

            $paidCents = $order->total_cents - $outstanding;
            $fullyPaid = $outstanding === 0;

            $order->update([
                'paid_cents' => $paidCents,
                'tip_cents' => $order->tip_cents + $tipTotal,
                'payment_status' => $fullyPaid ? PaymentStatus::Paid : PaymentStatus::Partial,
            ]);

            if ($fullyPaid) {
                $paidNow = true;
                $this->receipts->issueSale($order, $user);

                // A pay-at-counter order is still "open": paying it sends it to the kitchen.
                if ($order->status === OrderStatus::Open) {
                    $order = $this->statuses->transition($order, OrderStatus::Confirmed, $user, deviceId: $deviceId);
                }
            }

            return $order;
        });

        if ($paidNow) {
            DB::afterCommit(fn () => event(new OrderPaid($order)));
        }

        return $order->load(['items.modifiers', 'discounts', 'taxes', 'payments.method', 'payments.refunds', 'refunds', 'receipts', 'statusHistory']);
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
