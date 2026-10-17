<?php

namespace App\Enums;

enum WasteReason: string
{
    case Spoilage = 'spoilage';
    case Spill = 'spill';
    case Expired = 'expired';
    case Mistake = 'mistake';
    case Other = 'other';
}
