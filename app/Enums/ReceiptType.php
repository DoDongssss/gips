<?php

namespace App\Enums;

enum ReceiptType: string
{
    case Sale = 'sale';
    case Refund = 'refund';
    case Void = 'void';
}
