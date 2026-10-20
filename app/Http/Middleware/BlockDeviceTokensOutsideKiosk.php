<?php

namespace App\Http\Middleware;

use App\Models\Device;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Safety net for the whole API: a KIOSK device token may only reach routes named kiosk.api.*,
 * whatever the other routes check. Staff endpoints stay out of a stolen tablet's reach.
 * Other device types (for example the kitchen screen) keep using their own routes.
 * Register it once on the api group (see APPLY-kiosk.md).
 */
class BlockDeviceTokensOutsideKiosk
{
    public function handle(Request $request, Closure $next): Response
    {
        $device = $request->bearerToken() !== null ? $request->user('sanctum') : null;

        if ($device instanceof Device && $device->type === Device::KIOSK) {
            $name = (string) $request->route()?->getName();

            if (! str_starts_with($name, 'kiosk.api.')) {
                return response()->json(['message' => 'A kiosk token cannot be used here.'], 403);
            }
        }

        return $next($request);
    }
}
