<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Discount;
use App\Models\PaymentMethod;
use App\Models\Tax;
use App\Services\Shifts\ShiftService;
use App\Support\Approvers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class PosConfigController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:order.create')];
    }

    /** Everything the payment and discount screens need besides the menu. */
    public function __invoke(Request $request, ShiftService $shifts): JsonResponse
    {
        $shift = $shifts->current($request->user());
        $tax = Tax::where('is_active', true)->where('is_default', true)->first();

        return response()->json(['data' => [
            'shift' => ['required' => $shifts->isRequired(), 'open' => $shift !== null, 'opened_at' => $shift?->opened_at->toIso8601String()],
            'discounts' => Discount::usable()->orderBy('name')->get()->map(fn (Discount $d) => [
                'id' => $d->id,
                'name' => $d->name,
                'type' => $d->type->value,
                'value' => $d->value,
                'applies_to' => $d->applies_to->value,
                'requires_id' => $d->requires_id,
                'requires_approval' => $d->requires_approval,
                'is_vat_exempt' => $d->is_vat_exempt,
            ])->values(),
            'payment_methods' => PaymentMethod::where('is_active', true)->orderBy('sort_order')->get()->map(fn (PaymentMethod $m) => [
                'code' => $m->code,
                'name' => $m->name,
                'type' => $m->type->value,
                'requires_reference' => $m->requires_reference,
            ])->values(),
            'tax' => $tax ? [
                'name' => $tax->name,
                'rate' => (string) $tax->rate,
                'is_inclusive' => $tax->is_inclusive,
            ] : null,
            // Managers who can approve a senior/PWD discount with their PIN (the cashier picks one on screen).
            'approvers' => Approvers::for(['discount.manage']),
        ]]);
    }
}
