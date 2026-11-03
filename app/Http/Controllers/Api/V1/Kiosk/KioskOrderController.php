<?php

namespace App\Http\Controllers\Api\V1\Kiosk;

use App\Http\Controllers\Controller;
use App\Http\Requests\Kiosk\KioskOrderRequest;
use App\Models\Order;
use App\Services\Kiosk\KioskOrderService;
use Illuminate\Http\JsonResponse;

class KioskOrderController extends Controller
{
    /** 201 for a new order, 200 when this session already placed it (a retry). */
    public function store(KioskOrderRequest $request, KioskOrderService $service): JsonResponse
    {
        $validated = $request->validated();
        $sessionUuid = $validated['session_uuid'];
        $seniorPwd = (bool) ($validated['senior_pwd'] ?? false);
        unset($validated['session_uuid'], $validated['senior_pwd']);

        [$order, $created] = $service->place($request->user(), $sessionUuid, $validated, $seniorPwd);

        return response()->json(['data' => $this->present($order)], $created ? 201 : 200);
    }

    /** What the confirmation screen shows. No staff-only fields. */
    private function present(Order $order): array
    {
        $enum = fn ($v) => $v instanceof \BackedEnum ? $v->value : $v;

        return [
            'order_number' => $order->order_number,
            'type' => $enum($order->type),
            'subtotal_cents' => (int) $order->subtotal_cents,
            'discount_cents' => (int) $order->discount_cents,
            'tax_cents' => (int) $order->tax_cents,
            'total_cents' => (int) $order->total_cents,
            'requires_verification' => (bool) $order->requires_verification,
            'pay_at' => 'counter',
            'expires_in_minutes' => config('kiosk.unpaid_expiry_minutes'),
            'items' => $order->items->map(fn ($i) => [
                'name' => $i->product_name, 'variant' => $i->variant_name, 'quantity' => (int) $i->quantity,
                'line_total_cents' => (int) $i->line_total_cents,
                'modifiers' => $i->modifiers->map(fn ($m) => ['name' => $m->modifier_name, 'price_delta_cents' => (int) $m->price_delta_cents])->values(),
            ])->values(),
        ];
    }
}
