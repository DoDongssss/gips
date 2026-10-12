<?php

namespace App\Enums;

enum DiscountType: string
{
    case Percent = 'percent'; // value = basis points (2000 = 20%)
    case Fixed = 'fixed';     // value = centavos
}
