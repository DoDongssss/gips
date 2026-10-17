<?php

namespace App\Enums;

enum StockCountStatus: string
{
    case Draft = 'draft';
    case InProgress = 'in_progress';
    case Completed = 'completed';
}
