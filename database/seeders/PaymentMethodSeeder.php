<?php

namespace Database\Seeders;

use App\Enums\PaymentMethodType;
use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;

class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        $paymentMethods = [
            [
                'name' => 'Cash',
                'code' => 'CASH',
                'type' => PaymentMethodType::CASH,
                'requires_reference' => false,
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'GCash',
                'code' => 'GCASH',
                'type' => PaymentMethodType::E_WALLET,
                'requires_reference' => true,
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Maya',
                'code' => 'MAYA',
                'type' => PaymentMethodType::E_WALLET,
                'requires_reference' => true,
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'Bank Transfer',
                'code' => 'BANK_TRANSFER',
                'type' => PaymentMethodType::BANK_TRANSFER,
                'requires_reference' => true,
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'name' => 'Credit/Debit Card',
                'code' => 'CARD',
                'type' => PaymentMethodType::CARD,
                'requires_reference' => true,
                'is_active' => true,
                'sort_order' => 5,
            ],
        ];

        foreach ($paymentMethods as $paymentMethod) {
            PaymentMethod::updateOrCreate(
                ['code' => $paymentMethod['code']],
                $paymentMethod
            );
        }
    }
}