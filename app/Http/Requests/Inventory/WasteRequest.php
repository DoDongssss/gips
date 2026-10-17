<?php

namespace App\Http\Requests\Inventory;

use App\Enums\WasteReason;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class WasteRequest extends FormRequest
{
    use ChecksUnitConversion;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ingredient_id' => ['required', Rule::exists('ingredients', 'id')->whereNull('deleted_at')],
            'quantity' => ['required', 'numeric', 'gt:0', 'max:9999999999'],
            'unit_id' => ['nullable', 'exists:units,id'],
            'reason' => ['required', Rule::enum(WasteReason::class)],
            'notes' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isEmpty() && $this->filled('unit_id') && ! $this->convertsToBase($this->input('ingredient_id'), $this->input('unit_id'))) {
                $validator->errors()->add('unit_id', 'This unit cannot be converted to the ingredient base unit.');
            }
        }];
    }
}
