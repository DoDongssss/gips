<?php

namespace App\Http\Requests\Orders;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class DiscountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $discount = $this->route('discount');

        return [
            'name' => ['required', 'string', 'max:100'],
            'code' => ['nullable', 'string', 'max:30', Rule::unique('discounts', 'code')->ignore($discount?->id)],
            'type' => ['required', Rule::in(['percent', 'fixed'])],
            // percent: basis points (2000 = 20%), fixed: centavos
            'value' => ['required', 'integer', 'min:1', 'max:100000000'],
            'applies_to' => ['required', Rule::in(['order', 'item'])],
            'requires_id' => ['required', 'boolean'],
            'requires_approval' => ['required', 'boolean'],
            'is_vat_exempt' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
        ];
    }

    /** @return array<int, \Closure> */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($this->input('type') === 'percent' && (int) $this->input('value') > 10000) {
                $validator->errors()->add('value', 'A percentage cannot be more than 100%.');
            }
        }];
    }
}
