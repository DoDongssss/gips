<?php

namespace App\Enums;

enum DiscountScope: string
{
    case Order = 'order';
    case Item = 'item';
}
