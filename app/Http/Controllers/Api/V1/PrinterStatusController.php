<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\PrinterStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PrinterStatusController extends Controller
{
    public function __construct(private PrinterStatusService $status) {}

    /** A register tells the server whether its printer works. Called on every change and once a minute. */
    public function report(Request $request): JsonResponse
    {
        $data = $request->validate([
            'online' => ['required', 'boolean'],
            'message' => ['nullable', 'string', 'max:200'],
            'connection' => ['nullable', 'string', 'in:browser,usb,bluetooth,serial'],
        ]);

        $this->status->report($request->user(), (bool) $data['online'], $data['message'] ?? null, $data['connection'] ?? null);

        return response()->json(['data' => ['ok' => true]]);
    }

    /** Registers whose printer is not working right now. Powers the bell in the header. */
    public function alerts(): JsonResponse
    {
        $items = $this->status->problems();

        return response()->json(['data' => ['count' => count($items), 'items' => $items]]);
    }
}
