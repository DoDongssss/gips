<?php

namespace App\Enums;

enum KdsTicketStatus: string
{
    case New = 'new';
    case Preparing = 'preparing';
    case Ready = 'ready';
    case Bumped = 'bumped';
    case Cancelled = 'cancelled';

    /** Tickets still on a kitchen screen. */
    public function isOpen(): bool
    {
        return in_array($this, [self::New, self::Preparing, self::Ready], true);
    }
}
