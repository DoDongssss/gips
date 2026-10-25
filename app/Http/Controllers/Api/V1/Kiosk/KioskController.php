<?php

namespace App\Http\Controllers\Api\V1\Kiosk;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Models\KioskHeartbeat;
use App\Models\KioskScreen;
use App\Services\Devices\DevicePairingService;
use App\Services\Kiosk\UpsellService;
use App\Services\Menu\MenuService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Everything a kiosk tablet reads. Authenticated as the device, never as a staff user. */
class KioskController extends Controller
{
    /** Public (throttled): exchange the one-time code for a token. */
    public function pair(Request $request, DevicePairingService $pairing): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:20'], 'app_version' => ['nullable', 'string', 'max:50']]);

        [$device, $token] = $pairing->pair($data['code'], $request->ip(), $data['app_version'] ?? null);

        return response()->json(['data' => ['token' => $token, 'abilities' => DevicePairingService::ABILITIES] + $this->state($device)]);
    }

    /** Settings and the out-of-service flag. The kiosk polls this about every 15 seconds. */
    public function status(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->state($request->user())]);
    }

    /** Every 30 seconds. Records the ping, keeps "last seen" fresh and returns the same state as status. */
    public function heartbeat(Request $request): JsonResponse
    {
        $data = $request->validate(['status' => ['nullable', Rule::in(['online', 'busy', 'error'])], 'app_version' => ['nullable', 'string', 'max:50']]);
        $device = $request->user();

        $device->forceFill(['last_seen_at' => now(), 'ip_address' => $request->ip(), 'app_version' => $data['app_version'] ?? $device->app_version])->save();

        KioskHeartbeat::create(['device_id' => $device->id, 'status' => $data['status'] ?? 'online', 'app_version' => $data['app_version'] ?? null, 'ip_address' => $request->ip()]);

        return response()->json(['data' => $this->state($device)]);
    }

    /** The same menu the register uses. Sold-out items are left out. */
    public function menu(MenuService $menu): JsonResponse
    {
        return response()->json(['data' => $menu->menu(false)]);
    }

    /** Promo banners that are switched on and inside their dates. */
    public function screens(): JsonResponse
    {
        $screens = KioskScreen::query()->showing()->orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (KioskScreen $s) => ['id' => $s->id, 'title' => $s->title, 'type' => $s->type, 'image_url' => $s->imageUrl(), 'content' => $s->content]);

        return response()->json(['data' => $screens]);
    }

    /** Suggestions for what is in the cart. */
    public function upsell(Request $request, UpsellService $upsell): JsonResponse
    {
        $data = $request->validate(['product_ids' => ['required', 'array', 'min:1', 'max:50'], 'product_ids.*' => ['integer']]);

        if (! $request->user()->freshSettings()?->upsell_enabled) {
            return response()->json(['data' => []]);
        }

        return response()->json(['data' => $upsell->suggest($data['product_ids'])]);
    }

    /** @return array<string, mixed> */
    private function state(Device $device): array
    {
        return [
            'device' => ['id' => $device->id, 'name' => $device->name],
            'settings' => $device->freshSettings()?->toKiosk(),
            'unpaid_expiry_minutes' => config('kiosk.unpaid_expiry_minutes'),
            'server_time' => now()->toIso8601String(),
        ];
    }
}