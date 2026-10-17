<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class SupplierPriceRequest extends FormRequest
{
    use ChecksUnitConversion;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ingredient_id' => ['required', 'exists:ingredients,id'],
            'unit_id' => ['required', 'exists:units,id'],
            'supplier_sku' => ['nullable', 'string', 'max:255'],
            'unit_cost_cents' => ['required', 'integer', 'min:0', 'max:100000000'],
            'is_preferred' => ['required', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isEmpty() && ! $this->convertsToBase($this->input('ingredient_id'), $this->input('unit_id'))) {
                $validator->errors()->add('unit_id', 'This unit cannot be converted to the ingredient base unit. Add a conversion first.');
            }
        }];
    }
}
