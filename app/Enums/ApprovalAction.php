<?php

namespace App\Enums;

enum ApprovalAction: string
{
    case Discount = 'discount';
    case Void = 'void';
    case Refund = 'refund';
    case PriceOverride = 'price_override';
}
