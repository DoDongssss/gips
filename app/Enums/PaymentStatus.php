<?php

namespace App\Enums;

/** Payment status of an ORDER. */
enum PaymentStatus: string
{
    case Unpaid = 'unpaid';
    case Partial = 'partial';
    case Paid = 'paid';
    case Refunded = 'refunded';
}
