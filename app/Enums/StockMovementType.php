<?php

namespace App\Enums;

enum StockMovementType: string
{
    case Purchase = 'purchase';
    case Sale = 'sale';
    case Adjustment = 'adjustment';
    case Waste = 'waste';
    case Count = 'count';
    case Return = 'return';
}
