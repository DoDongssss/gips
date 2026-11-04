<?php

namespace App\Enums;

enum KdsTicketStatus: string
{
    case New = 'new';
    case Preparing = 'preparing';
    case Ready = 'ready';
    case Bumped = 'bumped';
    case Cancelled = 'cancelled';

    /**
     * Statuses still shown on a kitchen screen.
     *
     * @return list<string>
     */
    public static function openValues(): array
    {
        return [self::New->value, self::Preparing->value, self::Ready->value];
    }

    /** Tickets still on a kitchen screen. */
    public function isOpen(): bool
    {
        return in_array($this->value, self::openValues(), true);
    }
}
