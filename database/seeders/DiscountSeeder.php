<?php

namespace Database\Seeders;

use App\Enums\DiscountScope;
use App\Enums\DiscountType;
use App\Models\Discount;
use Illuminate\Database\Seeder;

class DiscountSeeder extends Seeder
{
    /**
     * The senior and PWD calculation must be confirmed with the store's accountant before launch.
     */
    public function run(): void
    {
        $discounts = [
            ['name' => 'Senior Citizen', 'code' => 'SENIOR'],
            ['name' => 'PWD', 'code' => 'PWD'],
        ];

        foreach ($discounts as $discount) {
            Discount::updateOrCreate(
                ['code' => $discount['code']],
                [
                    'name' => $discount['name'],
                    'type' => DiscountType::Percent,
                    'value' => 2000,
                    'applies_to' => DiscountScope::Order,
                    'requires_id' => true,
                    'requires_approval' => true,
                    'is_vat_exempt' => true,
                    'is_active' => true,
                ],
            );
        }
    }
}
