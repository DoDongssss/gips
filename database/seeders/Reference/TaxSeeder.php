<?php

namespace Database\Seeders\Reference;

use App\Models\Tax;
use Illuminate\Database\Seeder;

class TaxSeeder extends Seeder
{
    /**
     * The 12% rate is a placeholder until the store's accountant confirms it.
     */
    public function run(): void
    {
        Tax::updateOrCreate(
            ['name' => 'VAT'],
            [
                'rate' => 0.12,
                'is_inclusive' => true,
                'is_default' => true,
                'is_active' => true,
            ],
        );
    }
}
