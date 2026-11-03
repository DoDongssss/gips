<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class PurchaseOrderRequest extends FormRequest
{
    use ChecksUnitConversion;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'expected_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.ingredient_id' => ['required', 'exists:ingredients,id', 'distinct'],
            'items.*.unit_id' => ['required', 'exists:units,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0', 'max:9999999999'],
            'items.*.unit_cost_cents' => ['required', 'integer', 'min:0', 'max:100000000'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            foreach ($this->input('items') as $i => $item) {
                if (! $this->convertsToBase($item['ingredient_id'], $item['unit_id'])) {
                    $validator->errors()->add("items.{$i}.unit_id", 'This unit cannot be converted to the ingredient base unit.');
                }
            }
        }];
    }
}
