<?php

namespace App\Services\Shifts;

use App\Models\Shift;
use App\Models\User;

/** Maps a shift model to Inertia/API props. */
class ShiftPresenter
{
    public function __construct(private ShiftService $shifts) {}

    /**
     * @return array<string, mixed>
     */
    public function present(Shift $shift, User $viewer, bool $canViewAll): array
    {
        $isOpen = $shift->isOpen();
        $isOwner = $shift->user_id === $viewer->id;
        $showExpected = ! $isOpen || ($canViewAll && ! $isOwner);

        $cash = ($isOpen && $showExpected) || ! $isOpen
            ? $this->shifts->cashBreakdown($shift)
            : null;

        return [
            'id' => $shift->id,
            'cashier' => $shift->user?->name,
            'cashier_id' => $shift->user_id,
            'status' => $shift->status->value,
            'business_date' => $shift->business_date->toDateString(),
            'opened_at' => $shift->opened_at->toIso8601String(),
            'closed_at' => $shift->closed_at?->toIso8601String(),
            'opening_cash_cents' => $shift->opening_cash_cents,
            'expected_cash_cents' => $isOpen
                ? ($showExpected ? $this->shifts->expectedCashCents($shift) : null)
                : $shift->expected_cash_cents,
            'counted_cash_cents' => $shift->counted_cash_cents,
            'variance_cents' => $shift->variance_cents,
            'notes' => $shift->notes,
            'device_id' => $shift->device_id,
            'cash' => $cash,
            'close_preview_cents' => ($isOpen && $isOwner && $canViewAll)
                ? $this->shifts->expectedCashCents($shift)
                : null,
            'is_mine' => $isOwner,
            'movements' => $shift->relationLoaded('movements')
                ? $shift->movements->map(fn ($m) => [
                    'id' => $m->id,
                    'type' => $m->type->value,
                    'label' => $m->type->label(),
                    'amount_cents' => $m->amount_cents,
                    'reason' => $m->reason,
                    'by' => $m->user?->name,
                    'at' => $m->created_at?->toIso8601String(),
                ])->values()->all()
                : [],
        ];
    }
}
