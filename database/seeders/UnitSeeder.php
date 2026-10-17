<?php

namespace Database\Seeders;

use App\Models\Unit;
use App\Models\UnitConversion;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    public function run(): void
    {
        $units = [
            'g' => ['Gram', 'weight'], 'kg' => ['Kilogram', 'weight'],
            'ml' => ['Milliliter', 'volume'], 'l' => ['Liter', 'volume'],
            'pc' => ['Piece', 'count'],
        ];

        $ids = [];

        foreach ($units as $abbr => [$name, $type]) {
            $ids[$abbr] = Unit::firstOrCreate(['abbreviation' => $abbr], ['name' => $name, 'type' => $type])->id;
        }

        // The reverse (g -> kg) is derived, so only one direction is stored.
        UnitConversion::firstOrCreate(['from_unit_id' => $ids['kg'], 'to_unit_id' => $ids['g']], ['factor' => 1000]);
        UnitConversion::firstOrCreate(['from_unit_id' => $ids['l'], 'to_unit_id' => $ids['ml']], ['factor' => 1000]);
    }
}
