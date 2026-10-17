<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\UnitConversionRequest;
use App\Models\Unit;
use App\Models\UnitConversion;
use App\Services\Inventory\UnitConverter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class UnitConversionController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:inventory.adjust')];
    }

    /** 1 from-unit = factor to-unit. Saving the same pair again updates the factor. */
    public function store(UnitConversionRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $from = Unit::findOrFail($data['from_unit_id']);
        $to = Unit::findOrFail($data['to_unit_id']);

        // The reverse pair is derived, so a stored opposite row would conflict with it.
        UnitConversion::query()->where('from_unit_id', $to->id)->where('to_unit_id', $from->id)->delete();

        UnitConversion::updateOrCreate(
            ['from_unit_id' => $from->id, 'to_unit_id' => $to->id],
            ['factor' => $data['factor']],
        );

        app(UnitConverter::class)->flush();

        return back()->with('success', "1 {$from->abbreviation} = {$data['factor']} {$to->abbreviation} saved.");
    }

    public function destroy(UnitConversion $conversion): RedirectResponse
    {
        $conversion->delete();
        app(UnitConverter::class)->flush();

        return back()->with('success', 'Conversion removed.');
    }
}
