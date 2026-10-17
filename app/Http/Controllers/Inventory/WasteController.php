<?php

namespace App\Http\Controllers\Inventory;

use App\Enums\WasteReason;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\WasteRequest;
use App\Models\Ingredient;
use App\Models\WasteLog;
use App\Services\Inventory\WasteService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class WasteController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        // Anyone who can adjust stock can log waste; viewing the log needs inventory.view.
        return [
            new Middleware('permission:inventory.view', only: ['index']),
            new Middleware('permission:inventory.adjust', only: ['store']),
        ];
    }

    public function index(Request $request): Response
    {
        $logs = WasteLog::query()
            ->with(['ingredient:id,name,base_unit_id', 'ingredient.baseUnit:id,abbreviation', 'user:id,name'])
            ->when($request->integer('ingredient'), fn ($q, $id) => $q->where('ingredient_id', $id))
            ->when(WasteReason::tryFrom($request->string('reason')->toString()), fn ($q, $r) => $q->where('reason', $r->value))
            ->latest('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (WasteLog $w) => [
                'id' => $w->id,
                'ingredient' => $w->ingredient->name,
                'unit' => $w->ingredient->baseUnit?->abbreviation,
                'quantity' => (string) $w->quantity,
                'reason' => $w->reason->value,
                'notes' => $w->notes,
                'user' => $w->user->name,
                'created_at' => $w->created_at?->toIso8601String(),
            ]);

        return Inertia::render('inventory/waste/index', [
            'logs' => $logs,
            'reasons' => array_column(WasteReason::cases(), 'value'),
            'filters' => ['ingredient' => $request->integer('ingredient') ?: null, 'reason' => $request->input('reason')],
        ]);
    }

    public function store(WasteRequest $request, WasteService $waste): RedirectResponse
    {
        $data = $request->validated();
        $ingredient = Ingredient::findOrFail($data['ingredient_id']);

        $waste->log($ingredient, $data['quantity'], WasteReason::from($data['reason']), $request->user(), $data['notes'] ?? null, $data['unit_id'] ?? null);

        return back()->with('success', "Waste logged for {$ingredient->name}.");
    }
}
