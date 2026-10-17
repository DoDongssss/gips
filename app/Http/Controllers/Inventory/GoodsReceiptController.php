<?php

namespace App\Http\Controllers\Inventory;

use App\Enums\PurchaseOrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\GoodsReceiptRequest;
use App\Models\GoodsReceipt;
use App\Models\Ingredient;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\Unit;
use App\Services\Inventory\ReceivingService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class GoodsReceiptController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:inventory.receive|purchase.manage', only: ['index', 'show']),
            new Middleware('permission:inventory.receive', only: ['create', 'store']),
        ];
    }

    public function index(Request $request): Response
    {
        return Inertia::render('inventory/receipts/index', [
            'receipts' => GoodsReceipt::query()->with(['supplier:id,name', 'purchaseOrder:id,po_number', 'receiver:id,name'])->withCount('items')
                ->latest('id')->paginate(20)->withQueryString()
                ->through(fn (GoodsReceipt $r) => [
                    'id' => $r->id, 'receipt_number' => $r->receipt_number, 'supplier' => $r->supplier?->name,
                    'po_number' => $r->purchaseOrder?->po_number, 'invoice_no' => $r->invoice_no,
                    'items_count' => $r->items_count, 'received_by' => $r->receiver?->name,
                    'received_at' => $r->received_at?->toIso8601String(),
                ]),
        ]);
    }

    /** The receive screen. With ?purchase_order=ID the lines are prefilled with what is still outstanding. */
    public function create(Request $request): Response
    {
        $po = $request->integer('purchase_order')
            ? PurchaseOrder::query()->with(['items.ingredient:id,name', 'items.unit:id,abbreviation'])->findOrFail($request->integer('purchase_order'))
            : null;

        abort_if($po && ! in_array($po->status, [PurchaseOrderStatus::Sent, PurchaseOrderStatus::Partial], true), 403, 'This purchase order cannot receive goods.');

        return Inertia::render('inventory/receipts/create', [
            'order' => $po ? [
                'id' => $po->id, 'po_number' => $po->po_number, 'supplier_id' => $po->supplier_id,
                'items' => $po->items->map(fn ($i) => [
                    'purchase_order_item_id' => $i->id, 'ingredient_id' => $i->ingredient_id, 'ingredient' => $i->ingredient->name,
                    'unit_id' => $i->unit_id, 'unit' => $i->unit->abbreviation,
                    'quantity_outstanding' => number_format(max(0, (float) $i->quantity_ordered - (float) $i->quantity_received), 4, '.', ''),
                    'unit_cost_cents' => $i->unit_cost_cents,
                ])->values(),
            ] : null,
            'suppliers' => Supplier::query()->orderBy('name')->get(['id', 'name']),
            'ingredients' => Ingredient::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'base_unit_id', 'purchase_unit_id']),
            'units' => Unit::query()->orderBy('name')->get(['id', 'name', 'abbreviation']),
        ]);
    }

    public function show(GoodsReceipt $receipt): Response
    {
        $receipt->load(['supplier', 'purchaseOrder:id,po_number', 'receiver:id,name', 'items.ingredient:id,name', 'items.unit:id,abbreviation']);

        return Inertia::render('inventory/receipts/show', [
            'receipt' => [
                'id' => $receipt->id, 'receipt_number' => $receipt->receipt_number, 'supplier' => $receipt->supplier?->name,
                'po_number' => $receipt->purchaseOrder?->po_number, 'invoice_no' => $receipt->invoice_no, 'notes' => $receipt->notes,
                'received_by' => $receipt->receiver?->name, 'received_at' => $receipt->received_at?->toIso8601String(),
                'items' => $receipt->items->map(fn ($i) => [
                    'ingredient' => $i->ingredient->name, 'unit' => $i->unit->abbreviation, 'quantity' => (string) $i->quantity,
                    'unit_cost_cents' => $i->unit_cost_cents, 'batch_no' => $i->batch_no, 'expires_on' => $i->expires_on?->toDateString(),
                ]),
            ],
        ]);
    }

    public function store(GoodsReceiptRequest $request, ReceivingService $receiving): RedirectResponse
    {
        try {
            $receipt = $receiving->receive($request->validated(), $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['error' => $e->getMessage()]);
        }

        return redirect()->route('inventory.receipts.show', $receipt)->with('success', "{$receipt->receipt_number} received. Stock and average cost updated.");
    }
}
