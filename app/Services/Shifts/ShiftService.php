<?php

namespace App\Services\Shifts;

use App\Enums\CashMovementType;
use App\Enums\PaymentMethodType;
use App\Enums\PaymentRecordStatus;
use App\Enums\RefundStatus;
use App\Enums\ShiftStatus;
use App\Models\CashMovement;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Shift;
use App\Models\User;
use App\Support\Audit;
use App\Support\BusinessDate;
use App\Support\ClosedDay;
use App\Support\PosSettings;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ShiftService
{
    public function current(User $user): ?Shift
    {
        return Shift::where('user_id', $user->id)->where('status', ShiftStatus::Open->value)->latest('id')->first();
    }

    public function isRequired(): bool
    {
        return (bool) PosSettings::get('shifts', 'require_open_shift', true);
    }

    /**
     * The shift a payment or cash refund is booked to.
     * With the setting on, a person without an open shift cannot take money.
     */
    public function forMoney(User $user): ?Shift
    {
        $shift = $this->current($user);

        if (! $shift && $this->isRequired()) {
            throw ValidationException::withMessages(['shift' => 'Open your shift before taking payments or giving refunds.']);
        }

        return $shift;
    }

    public function open(User $user, int $openingCashCents, ?int $deviceId = null): Shift
    {
        return DB::transaction(function () use ($user, $openingCashCents, $deviceId) {
            // Serialize two clicks on "open shift" for the same person.
            User::query()->lockForUpdate()->findOrFail($user->id);

            if ($this->current($user)) {
                throw ValidationException::withMessages(['shift' => 'You already have an open shift.']);
            }

            $businessDate = BusinessDate::current();
            ClosedDay::assertOpen($businessDate, 'shift');

            $shift = Shift::create([
                'user_id' => $user->id,
                'device_id' => $deviceId,
                'status' => ShiftStatus::Open,
                'business_date' => $businessDate,
                'opened_at' => now(),
                'opening_cash_cents' => $openingCashCents,
            ]);

            Audit::record('shifts', 'shift.opened', 'Shift opened', $shift, [
                'opening_cash_cents' => $openingCashCents,
            ]);

            return $shift;
        });
    }

    public function addMovement(Shift $shift, User $user, CashMovementType $type, int $amountCents, string $reason): CashMovement
    {
        return DB::transaction(function () use ($shift, $user, $type, $amountCents, $reason) {
            $shift = Shift::query()->lockForUpdate()->findOrFail($shift->id);

            if (! $shift->isOpen()) {
                throw ValidationException::withMessages(['shift' => 'This shift is already closed.']);
            }

            if (! $type->addsToDrawer() && $amountCents > $this->expectedCashCents($shift)) {
                throw ValidationException::withMessages(['amount_cents' => 'That is more cash than the drawer should hold.']);
            }

            $movement = $shift->movements()->create([
                'type' => $type,
                'amount_cents' => $amountCents,
                'reason' => $reason,
                'user_id' => $user->id,
            ]);

            Audit::record('shifts', 'shift.cash-movement', "{$type->label()}: {$reason}", $shift, [
                'type' => $type->value,
                'amount_cents' => $amountCents,
            ]);

            return $movement;
        });
    }

    /**
     * Close the shift: store what the drawer should hold, what was counted, and the difference.
     * The expected figure is worked out on the server; the screen never sends it.
     */
    public function close(Shift $shift, User $user, int $countedCents, ?string $notes = null): Shift
    {
        return DB::transaction(function () use ($shift, $user, $countedCents, $notes) {
            $shift = Shift::query()->lockForUpdate()->findOrFail($shift->id);

            if (! $shift->isOpen()) {
                throw ValidationException::withMessages(['shift' => 'This shift is already closed.']);
            }

            $expected = $this->expectedCashCents($shift);

            $shift->update([
                'status' => ShiftStatus::Closed,
                'closed_at' => now(),
                'expected_cash_cents' => $expected,
                'counted_cash_cents' => $countedCents,
                'variance_cents' => $countedCents - $expected,
                'notes' => $notes,
            ]);

            Audit::record('shifts', 'shift.closed', 'Shift closed', $shift, [
                'closed_by' => $user->id,
                'expected_cash_cents' => $expected,
                'counted_cash_cents' => $countedCents,
                'variance_cents' => $countedCents - $expected,
            ]);

            return $shift;
        });
    }

    /**
     * Put a closed shift back to open (a misclick on "close shift"). The cashier counts again when they close it.
     * Refused when that day already has a Z report, or when the cashier has opened another shift since.
     */
    public function reopen(Shift $shift, User $actor, string $reason): Shift
    {
        return DB::transaction(function () use ($shift, $actor, $reason) {
            $shift = Shift::query()->lockForUpdate()->findOrFail($shift->id);

            if ($shift->isOpen()) {
                throw ValidationException::withMessages(['shift' => 'This shift is already open.']);
            }

            $date = \Illuminate\Support\Carbon::parse($shift->business_date)->toDateString();

            // A shift can only be reopened while its own day is reopened (Z reports page > Reopen day).
            if (! DB::table('reopened_days')->where('business_date', $date)->exists()) {
                throw ValidationException::withMessages(['shift' => "Reopen {$date} on the Z reports page first. A shift can only be reopened while its day is reopened."]);
            }

            // Safety net: a day that has a Z report again is locked.
            ClosedDay::assertOpen($date, 'shift');

            // Serialize with "open shift" for the same cashier, then make sure they have no other open shift.
            User::query()->lockForUpdate()->findOrFail($shift->user_id);

            if (Shift::where('user_id', $shift->user_id)->where('status', ShiftStatus::Open->value)->exists()) {
                throw ValidationException::withMessages(['shift' => 'This cashier already has an open shift. Close it first.']);
            }

            $before = [
                'closed_at' => $shift->closed_at?->toIso8601String(),
                'expected_cash_cents' => $shift->expected_cash_cents,
                'counted_cash_cents' => $shift->counted_cash_cents,
                'variance_cents' => $shift->variance_cents,
            ];

            $shift->update([
                'status' => ShiftStatus::Open,
                'closed_at' => null,
                'expected_cash_cents' => null,
                'counted_cash_cents' => null,
                'variance_cents' => null,
            ]);

            Audit::record('shifts', 'shift.reopened', "Shift reopened: {$reason}", $shift, [
                'reopened_by' => $actor->id,
                'cashier_id' => $shift->user_id,
                'reason' => $reason,
                'previous' => $before,
            ]);

            return $shift;
        });
    }

    /**
     * What the drawer should hold:
     *   opening cash + cash payments (tips left in the drawer included) + cash in
     *   - cash out, drops and payouts - cash refunds.
     * Payments that were later refunded still count as money taken; the refund row takes it back out.
     */
    public function expectedCashCents(Shift $shift): int
    {
        return $this->cashBreakdown($shift)['expected_cents'];
    }

    /** @return array<string, int> */
    public function cashBreakdown(Shift $shift): array
    {
        $cashPayments = Payment::query()
            ->where('shift_id', $shift->id)
            ->whereIn('status', [PaymentRecordStatus::Completed->value, PaymentRecordStatus::Refunded->value])
            ->whereHas('method', fn ($q) => $q->where('type', PaymentMethodType::CASH->value));

        $cashSales = (int) (clone $cashPayments)->sum('amount_cents');
        $cashTips = (int) (clone $cashPayments)->sum('tip_cents');

        $movements = CashMovement::where('shift_id', $shift->id)->get(['type', 'amount_cents']);
        $cashIn = (int) $movements->filter(fn ($m) => $m->type->addsToDrawer())->sum('amount_cents');
        $cashOut = (int) $movements->reject(fn ($m) => $m->type->addsToDrawer())->sum('amount_cents');

        $cashRefunds = (int) Refund::query()
            ->where('shift_id', $shift->id)
            ->where('status', RefundStatus::Completed->value)
            ->whereHas('payment.method', fn ($q) => $q->where('type', PaymentMethodType::CASH->value))
            ->sum('amount_cents');

        return [
            'opening_cents' => $shift->opening_cash_cents,
            'cash_sales_cents' => $cashSales,
            'cash_tips_cents' => $cashTips,
            'cash_in_cents' => $cashIn,
            'cash_out_cents' => $cashOut,
            'cash_refunds_cents' => $cashRefunds,
            'expected_cents' => $shift->opening_cash_cents + $cashSales + $cashTips + $cashIn - $cashOut - $cashRefunds,
        ];
    }
}
