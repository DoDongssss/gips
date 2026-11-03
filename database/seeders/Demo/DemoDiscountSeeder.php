<?php

namespace Database\Seeders\Demo;

use App\Enums\DiscountScope;
use App\Enums\DiscountType;
use App\Models\Discount;
use Illuminate\Database\Seeder;

/** Promo discounts for testing the POS. The legal ones (Senior, PWD) are in Reference\DiscountSeeder. */
class DemoDiscountSeeder extends Seeder
{
    public function run(): void
    {
        // code, name, type, value (percent x100, or centavos), scope, needs manager approval
        $discounts = [
            ['PROMO10', '10% Promo', DiscountType::Percent, 1000, DiscountScope::Order, false],
            ['STAFF20', 'Staff Meal 20%', DiscountType::Percent, 2000, DiscountScope::Order, true],
            ['VOUCHER50', 'P50 Voucher', DiscountType::Fixed, 5000, DiscountScope::Order, false],
            ['FREECOOKIE', 'Free Cookie (item)', DiscountType::Percent, 10000, DiscountScope::Item, true],
        ];

        foreach ($discounts as [$code, $name, $type, $value, $scope, $requiresApproval]) {
            Discount::updateOrCreate(['code' => $code], [
                'name' => $name,
                'type' => $type,
                'value' => $value,
                'applies_to' => $scope,
                'requires_id' => false,
                'requires_approval' => $requiresApproval,
                'is_vat_exempt' => false,
                'is_active' => true,
            ]);
        }
    }
}
