<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class GoodsReceiptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** Unit and purchase-order rules are checked in ReceivingService, which refuses with a readable message. */
    public function rules(): array
    {
        return [
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'purchase_order_id' => ['nullable', 'exists:purchase_orders,id'],
            'received_at' => ['nullable', 'date'],
            'invoice_no' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.purchase_order_item_id' => ['nullable', 'exists:purchase_order_items,id'],
            'items.*.ingredient_id' => ['required', 'exists:ingredients,id'],
            'items.*.unit_id' => ['required', 'exists:units,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0', 'max:9999999999'],
            'items.*.unit_cost_cents' => ['required', 'integer', 'min:0', 'max:100000000'],
            'items.*.batch_no' => ['nullable', 'string', 'max:255'],
            'items.*.expires_on' => ['nullable', 'date'],
        ];
    }
}
