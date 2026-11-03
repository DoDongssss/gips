<?php

namespace App\Enums;

/** Status of a single payments row. */
enum PaymentRecordStatus: string
{
    case Pending = 'pending';
    case Completed = 'completed';
    case Failed = 'failed';
    case Refunded = 'refunded';
    case Voided = 'voided';
}
