<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PrinterSettingsRequest;
use App\Services\ConfigurationService;
use App\Services\PrinterSettingsService;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

/** Settings > Printer: how receipts are printed. The register reads the same values from /api/v1/pos/printer. */
class PrinterController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:setting.view', only: ['show']),
            new Middleware('permission:setting.update', only: ['update']),
            new Middleware('permission:order.create', only: ['forRegister']),
        ];
    }

    public function show(PrinterSettingsService $printer, ConfigurationService $configuration): Response
    {
        return Inertia::render('printer/index', [
            'settings' => $printer->all(),
            'connections' => config('printer.connections'),
            // For the test receipt.
            'business' => [
                'name' => $configuration->get('business_name'),
                'address' => $configuration->get('business_address'),
                'phone' => $configuration->get('business_phone'),
            ],
        ]);
    }

    public function update(PrinterSettingsRequest $request, PrinterSettingsService $printer): RedirectResponse
    {
        $changes = $printer->update($request->validated(), $request->user());

        if ($changes !== []) {
            Audit::record('settings', 'printer.updated', 'Printer settings updated', null, ['changes' => $changes]);
        }

        return back()->with('success', 'Printer settings saved.');
    }

    /** What the register needs to print (cashiers do not have setting.view). */
    public function forRegister(PrinterSettingsService $printer): JsonResponse
    {
        return response()->json(['data' => $printer->all()]);
    }
}
