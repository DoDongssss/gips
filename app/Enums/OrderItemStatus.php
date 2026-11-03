<?php

namespace App\Enums;

enum OrderItemStatus: string
{
    case Pending = 'pending';
    case Sent = 'sent';
    case Preparing = 'preparing';
    case Ready = 'ready';
    case Served = 'served';
    case Voided = 'voided';
}
