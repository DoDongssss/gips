<?php

namespace App\Enums;

enum OrderType: string
{
    case DineIn = 'dine_in';
    case Takeout = 'takeout';
    case Delivery = 'delivery';
}
