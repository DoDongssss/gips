<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Open = 'open';
    case Confirmed = 'confirmed';
    case Preparing = 'preparing';
    case Ready = 'ready';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
    case Voided = 'voided';

    /** @return array<int, self> */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Open => [self::Confirmed, self::Cancelled],
            self::Confirmed => [self::Preparing, self::Ready, self::Cancelled, self::Voided],
            self::Preparing => [self::Ready, self::Cancelled, self::Voided],
            self::Ready => [self::Completed, self::Voided, self::Preparing], // Preparing: kitchen recalled a bump
            self::Completed => [self::Voided],
            self::Cancelled, self::Voided => [],
        };
    }

    public function canTransitionTo(self $to): bool
    {
        return in_array($to, $this->allowedTransitions(), true);
    }

    public function isTerminal(): bool
    {
        return $this->allowedTransitions() === [];
    }

    /** Statuses in which a payment can still be taken. */
    public function acceptsPayment(): bool
    {
        return in_array($this, [self::Open, self::Confirmed, self::Preparing, self::Ready], true);
    }
}
