<?php

namespace Database\Seeders\Reference;

use App\Enums\StationType;
use App\Models\Station;
use Illuminate\Database\Seeder;

/** Preparation stations (bar, kitchen, pastry) that categories are routed to on the KDS. */
class StationSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([['Bar', StationType::Bar], ['Kitchen', StationType::Kitchen], ['Pastry', StationType::Pastry]] as $index => [$name, $type]) {
            Station::updateOrCreate(['slug' => strtolower($name)], [
                'name' => $name,
                'type' => $type,
                'is_active' => true,
                'sort_order' => $index + 1,
            ]);
        }
    }
}
