<?php

namespace App\Services\Payments;

use App\Enums\ApprovalAction;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethodType;
use App\Enums\PaymentRecordStatus;
use App\Enums\PaymentStatus;
use App\Enums\RefundStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Shift;
use App\Models\User;
use App\Services\Orders\ApprovalService;
use App\Services\Shifts\ShiftService;
use App\Support\Audit;
use App\Support\BusinessDate;
use App\Support\ClosedDay;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Money going back to the customer. A refund is a new row; the payment is never edited away.
 * A refund can never be more than what is left of its payment, and it is booked to the day
 * and shift when it is given, so a closed day never changes.
 */
class RefundService
{
    public function __construct(
        private ShiftService $shifts,
        private ReceiptService $receipts,
        private ApprovalService $approvals,
    ) {}

    /**
     * Refund part or all of one payment. Staff without payment.refund need a manager's PIN.
     *
     * @param  array{user_id?:int|string, pin?:string}|null  $approval
     */
    public function refund(Order $order, Payment $payment, int $amountCents, string $reason, User $actor, ?array $approval): Refund
    {
        return DB::transaction(function () use ($order, $payment, $amountCents, $reason, $actor, $approval) {
            $order = Order::query()->lockForUpdate()->findOrFail($order->id);
            $payment = Payment::query()->lockForUpdate()->with('method')->findOrFail($payment->id);

            if ($payment->order_id !== $order->id) {
                $this->fail('payment_id', 'That payment belongs to a different order.');
            }
            if (in_array($order->status, [OrderStatus::Voided, OrderStatus::Cancelled], true)) {
                $this->fail('order', "A {$order->status->value} order cannot be refunded.");
            }
            ClosedDay::assertOpen(BusinessDate::current(), 'order');

            if ($payment->status !== PaymentRecordStatus::Completed) {
                $this->fail('payment_id', 'That payment has nothing left to refund.');
            }

            $remaining = $this->refundableCents($payment);
            if ($amountCents <= 0) {
                $this->fail('amount_cents', 'Enter the amount to refund.');
            }
            if ($amountCents > $remaining) {
                $this->fail('amount_cents', 'A refund cannot be more than what is left of the payment.');
            }

            $approver = $this->approvals->resolve($actor, $approval, 'payment.refund');
            $shift = $this->shiftFor($payment, $actor);

            $refund = $this->create($order, $payment, $amountCents, $reason, $actor, $approver, $shift);
            $this->approvals->record($actor, $approver, ApprovalAction::Refund, $refund, $reason);
            $this->settle($order, $payment);
            $this->receipts->issueRefund($refund, $actor);

            Audit::record('orders', 'order.refunded', "Refund on order {$order->order_number}", $order, [
                'refund_id' => $refund->id,
                'amount_cents' => $amountCents,
                'reason' => $reason,
                'approved_by' => $approver->id,
            ]);

            return $refund;
        });
    }

    /**
     * Hand back everything still held on a voided order. Run inside the void's transaction,
     * after the order has been marked voided.
     *
     * @return Collection<int, Refund>
     */
    public function refundAllForVoid(Order $order, User $actor, User $approver, string $reason): Collection
    {
        if (ClosedDay::isClosed($order->business_date->toDateString())) {
            $this->fail('order', 'That business day is closed. Use a refund instead of a void.');
        }

        $order = Order::query()->lockForUpdate()->findOrFail($order->id);
        $refunds = collect();

        $payments = $order->payments()->lockForUpdate()->with('method')
            ->where('status', PaymentRecordStatus::Completed->value)->get();

        foreach ($payments as $payment) {
            $remaining = $this->refundableCents($payment);
            if ($remaining <= 0) {
                continue;
            }

            $refund = $this->create($order, $payment, $remaining, $reason, $actor, $approver, $this->shiftFor($payment, $actor));
            $this->settle($order, $payment);
            $refunds->push($refund);
        }

        if ($refunds->isNotEmpty()) {
            $this->receipts->issueVoid($order, $refunds, $reason, $actor);
        }

        return $refunds;
    }

    /** What is left of a payment after earlier refunds. */
    public function refundableCents(Payment $payment): int
    {
        $refunded = (int) $payment->refunds()->where('status', RefundStatus::Completed->value)->sum('amount_cents');

        return max(0, $payment->amount_cents - $refunded);
    }

    /** Cash refunds come out of the drawer, so they need an open shift when shifts are required. */
    private function shiftFor(Payment $payment, User $actor): ?Shift
    {
        return $payment->method->type === PaymentMethodType::CASH
            ? $this->shifts->forMoney($actor)
            : $this->shifts->current($actor);
    }

    private function create(Order $order, Payment $payment, int $amountCents, string $reason, User $actor, User $approver, ?Shift $shift): Refund
    {
        return Refund::create([
            'order_id' => $order->id,
            'payment_id' => $payment->id,
            'shift_id' => $shift?->id,
            'business_date' => BusinessDate::current(),
            'amount_cents' => $amountCents,
            'reason' => $reason,
            'status' => RefundStatus::Completed,
            'refunded_by' => $actor->id,
            'approved_by' => $approver->id,
            'refunded_at' => now(),
        ]);
    }

    /** Mark the payment, and then the order, as refunded once nothing is left to give back. */
    private function settle(Order $order, Payment $payment): void
    {
        if ($this->refundableCents($payment) === 0) {
            $payment->update(['status' => PaymentRecordStatus::Refunded]);
        }

        $stillHeld = $order->payments()->where('status', PaymentRecordStatus::Completed->value)->exists();
        if (! $stillHeld) {
            $order->update(['payment_status' => PaymentStatus::Refunded]);
        }
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
