<?php

namespace App\Http\Controllers\Inventory;

use App\Enums\PurchaseOrderStatus;
use App\Http\Controllers\Concerns\ReportsDomainErrors;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\PurchaseOrderRequest;
use App\Models\Ingredient;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\SupplierIngredient;
use App\Models\Unit;
use App\Services\Inventory\PurchaseOrderService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseOrderController extends Controller implements HasMiddleware
{
    use ReportsDomainErrors;

    public static function middleware(): array
    {
        return [new Middleware('permission:purchase.manage')];
    }

    public function index(Request $request): Response
    {
        $status = PurchaseOrderStatus::tryFrom($request->string('status')->toString());

        return Inertia::render('inventory/purchase-orders/index', [
            'orders' => PurchaseOrder::query()->with('supplier:id,name')->withCount('items')
                ->when($status, fn ($q, $s) => $q->where('status', $s->value))
                ->when($request->integer('supplier'), fn ($q, $id) => $q->where('supplier_id', $id))
                ->latest('id')->paginate(20)->withQueryString()
                ->through(fn (PurchaseOrder $p) => $this->summary($p)),
            'suppliers' => Supplier::query()->orderBy('name')->get(['id', 'name']),
            'statuses' => array_column(PurchaseOrderStatus::cases(), 'value'),
            'filters' => ['status' => $status?->value, 'supplier' => $request->integer('supplier') ?: null],
        ]);
    }

    /** Pickers for the create/edit form, plus the supplier price list used to prefill costs. */
    public function create(): Response
    {
        return Inertia::render('inventory/purchase-orders/form', $this->formProps(null));
    }

    public function edit(PurchaseOrder $purchaseOrder): Response
    {
        abort_unless($purchaseOrder->status === PurchaseOrderStatus::Draft, 403, 'Only a draft can be edited.');

        return Inertia::render('inventory/purchase-orders/form', $this->formProps($purchaseOrder));
    }

    public function show(PurchaseOrder $purchaseOrder): Response
    {
        $purchaseOrder->load(['supplier', 'creator:id,name', 'items.ingredient:id,name', 'items.unit:id,abbreviation', 'receipts.receiver:id,name']);

        return Inertia::render('inventory/purchase-orders/show', [
            'order' => $this->summary($purchaseOrder) + [
                'notes' => $purchaseOrder->notes,
                'created_by' => $purchaseOrder->creator?->name,
                'items' => $purchaseOrder->items->map(fn ($i) => [
                    'id' => $i->id, 'ingredient_id' => $i->ingredient_id, 'ingredient' => $i->ingredient->name,
                    'unit_id' => $i->unit_id, 'unit' => $i->unit->abbreviation,
                    'quantity_ordered' => (string) $i->quantity_ordered, 'quantity_received' => (string) $i->quantity_received,
                    'quantity_outstanding' => number_format(max(0, (float) $i->quantity_ordered - (float) $i->quantity_received), 4, '.', ''),
                    'unit_cost_cents' => $i->unit_cost_cents,
                ]),
                'receipts' => $purchaseOrder->receipts->map(fn ($r) => [
                    'id' => $r->id, 'receipt_number' => $r->receipt_number, 'invoice_no' => $r->invoice_no,
                    'received_at' => $r->received_at?->toIso8601String(), 'received_by' => $r->receiver?->name,
                ]),
            ],
        ]);
    }

    public function store(PurchaseOrderRequest $request, PurchaseOrderService $orders): RedirectResponse
    {
        $po = $orders->create($request->validated(), $request->user());

        return redirect()->route('inventory.purchase-orders.show', $po)->with('success', "{$po->po_number} created as a draft.");
    }

    public function update(PurchaseOrderRequest $request, PurchaseOrder $purchaseOrder, PurchaseOrderService $orders): RedirectResponse
    {
        $data = $request->validated();

        return $this->attempt(fn () => $orders->update($purchaseOrder, $data), "{$purchaseOrder->po_number} updated.");
    }

    public function send(PurchaseOrder $purchaseOrder, PurchaseOrderService $orders): RedirectResponse
    {
        return $this->attempt(fn () => $orders->send($purchaseOrder), "{$purchaseOrder->po_number} marked as sent.");
    }

    public function cancel(PurchaseOrder $purchaseOrder, PurchaseOrderService $orders): RedirectResponse
    {
        return $this->attempt(fn () => $orders->cancel($purchaseOrder), "{$purchaseOrder->po_number} cancelled.");
    }

    private function summary(PurchaseOrder $p): array
    {
        return [
            'id' => $p->id, 'po_number' => $p->po_number, 'status' => $p->status->value,
            'supplier' => ['id' => $p->supplier_id, 'name' => $p->supplier?->name],
            'ordered_at' => $p->ordered_at?->toIso8601String(), 'expected_at' => $p->expected_at?->toDateString(),
            'total_cents' => $p->total_cents, 'items_count' => $p->items_count ?? null,
            'can_edit' => $p->status === PurchaseOrderStatus::Draft,
            'can_send' => $p->status === PurchaseOrderStatus::Draft,
            'can_cancel' => in_array($p->status, [PurchaseOrderStatus::Draft, PurchaseOrderStatus::Sent], true),
            'can_receive' => in_array($p->status, [PurchaseOrderStatus::Sent, PurchaseOrderStatus::Partial], true),
        ];
    }

    private function formProps(?PurchaseOrder $po): array
    {
        return [
            'order' => $po?->load('items'),
            'suppliers' => Supplier::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'ingredients' => Ingredient::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'base_unit_id', 'purchase_unit_id']),
            'units' => Unit::query()->orderBy('name')->get(['id', 'name', 'abbreviation']),
            'prices' => SupplierIngredient::query()->get(['supplier_id', 'ingredient_id', 'unit_id', 'unit_cost_cents', 'is_preferred']),
        ];
    }
}
