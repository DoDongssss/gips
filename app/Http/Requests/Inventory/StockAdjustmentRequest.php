<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StockAdjustmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** quantity_change is signed, in the ingredient base unit. A note is required so the ledger explains itself. */
    public function rules(): array
    {
        return [
            'quantity_change' => ['required', 'numeric', 'min:-9999999999', 'max:9999999999'],
            'notes' => ['required', 'string', 'min:3', 'max:255'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isEmpty() && (float) $this->input('quantity_change') == 0.0) {
                $validator->errors()->add('quantity_change', 'The adjustment cannot be zero.');
            }
        }];
    }
}
