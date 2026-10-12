<?php

namespace App\Enums;

enum PaymentMethodType: string
{
    case CASH = 'cash';
    case E_WALLET = 'e_wallet';
    case BANK_TRANSFER = 'bank_transfer';
    case CARD = 'card';
}
