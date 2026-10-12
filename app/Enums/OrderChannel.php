<?php

namespace App\Enums;

enum OrderChannel: string
{
    case Pos = 'pos';
    case Kiosk = 'kiosk';
    case Online = 'online';
    case Delivery = 'delivery';
}
