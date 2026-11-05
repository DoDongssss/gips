<?php

namespace App\Enums;

enum LoyaltyTransactionType: string
{
    case Earned = 'earned';
    case Redeemed = 'redeemed';
    case Adjusted = 'adjusted';
    case Reversed = 'reversed';
}
