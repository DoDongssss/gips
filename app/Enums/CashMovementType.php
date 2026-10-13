<?php

namespace App\Enums;

enum CashMovementType: string
{
    case CashIn = 'cash_in';
    case CashOut = 'cash_out';
    case Drop = 'drop';
    case Payout = 'payout';

    /** Cash in adds to the drawer; every other type takes cash out of it. */
    public function addsToDrawer(): bool
    {
        return $this === self::CashIn;
    }

    public function label(): string
    {
        return match ($this) {
            self::CashIn => 'Cash in',
            self::CashOut => 'Cash out',
            self::Drop => 'Safe drop',
            self::Payout => 'Payout',
        };
    }
}
