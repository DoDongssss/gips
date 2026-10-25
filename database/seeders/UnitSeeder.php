<?php

namespace Database\Seeders;

use App\Models\Unit;
use App\Models\UnitConversion;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    public function run(): void
    {
        // abbreviation => [name, type, size relative to the type's base unit]
        // Bases: weight = gram, volume = milliliter, count = piece.
        // Volume units use US customary definitions.
        $units = [
            // Weight
            'mg'     => ['Milligram',   'weight', 0.001],
            'g'      => ['Gram',        'weight', 1],
            'kg'     => ['Kilogram',    'weight', 1000],
            'oz'     => ['Ounce',       'weight', 28.349523125],
            'lb'     => ['Pound',       'weight', 453.59237],

            // Volume
            'ml'     => ['Milliliter',  'volume', 1],
            'tsp'    => ['Teaspoon',    'volume', 4.92892159375],
            'tbsp'   => ['Tablespoon',  'volume', 14.78676478125],
            'fl_oz'  => ['Fluid Ounce', 'volume', 29.5735295625],
            'cup'    => ['Cup',         'volume', 236.5882365],
            'pt'     => ['Pint',        'volume', 473.176473],
            'qt'     => ['Quart',       'volume', 946.352946],
            'l'      => ['Liter',       'volume', 1000],
            'gal'    => ['Gallon',      'volume', 3785.411784],

            // Count
            'pc'     => ['Piece',       'count',  1],
            'doz'    => ['Dozen',       'count',  12],
        ];

        $ids = [];
        $byType = [];

        foreach ($units as $abbr => [$name, $type, $size]) {
            $ids[$abbr] = Unit::updateOrCreate(
                ['abbreviation' => $abbr],
                ['name' => $name, 'type' => $type]
            )->id;

            $byType[$type][$abbr] = $size;
        }

        // Only one direction is stored (larger -> smaller, so factor > 1).
        // The reverse (e.g. g -> kg) is derived.
        foreach ($byType as $sizes) {
            arsort($sizes); // largest unit first

            $abbrs = array_keys($sizes);

            foreach ($abbrs as $i => $from) {
                foreach (array_slice($abbrs, $i + 1) as $to) {
                    UnitConversion::updateOrCreate(
                        [
                            'from_unit_id' => $ids[$from],
                            'to_unit_id'   => $ids[$to],
                        ],
                        ['factor' => round($sizes[$from] / $sizes[$to], 6)]
                    );
                }
            }
        }
    }
}