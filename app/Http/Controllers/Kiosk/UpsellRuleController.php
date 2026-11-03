<?php

namespace App\Http\Controllers\Kiosk;

use App\Http\Controllers\Controller;
use App\Http\Requests\Kiosk\UpsellRuleRequest;
use App\Models\UpsellRule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/** "Customers who order X are offered Y." */
class UpsellRuleController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:device.manage')];
    }

    public function index(): Response
    {
        return Inertia::render('kiosk/upsell/index', [
            'rules' => UpsellRule::query()->with(['triggerProduct:id,name', 'triggerCategory:id,name', 'suggestedProduct:id,name'])
                ->orderByDesc('priority')->orderBy('id')->get()->map(fn (UpsellRule $r) => [
                    'id' => $r->id, 'trigger_product_id' => $r->trigger_product_id, 'trigger_category_id' => $r->trigger_category_id,
                    'trigger' => $r->triggerProduct?->name ?? $r->triggerCategory?->name, 'trigger_kind' => $r->trigger_product_id ? 'product' : 'category',
                    'suggested_product_id' => $r->suggested_product_id, 'suggested' => $r->suggestedProduct?->name,
                    'channel' => $r->channel, 'message' => $r->message, 'priority' => $r->priority, 'is_active' => $r->is_active,
                ]),
            'products' => DB::table('products')->whereNull('deleted_at')->orderBy('name')->get(['id', 'name']),
            'categories' => DB::table('categories')->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(UpsellRuleRequest $request): RedirectResponse
    {
        UpsellRule::create($request->validated());

        return back()->with('success', 'Rule added.');
    }

    public function update(UpsellRuleRequest $request, UpsellRule $rule): RedirectResponse
    {
        $rule->update($request->validated());

        return back()->with('success', 'Rule saved.');
    }

    public function destroy(UpsellRule $rule): RedirectResponse
    {
        $rule->delete();

        return back()->with('success', 'Rule deleted.');
    }
}
