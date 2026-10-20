<?php

namespace App\Http\Requests\Kiosk;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpsellRuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'trigger_product_id' => ['nullable', 'integer', 'exists:products,id'],
            'trigger_category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'suggested_product_id' => ['required', 'integer', 'exists:products,id'],
            'channel' => ['required', Rule::in(['all', 'pos', 'kiosk'])],
            'message' => ['nullable', 'string', 'max:150'],
            'priority' => ['required', 'integer', 'min:0', 'max:1000'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $v) {
            if (! $this->filled('trigger_product_id') && ! $this->filled('trigger_category_id')) {
                $v->errors()->add('trigger_product_id', 'Pick a product or a category that triggers the suggestion.');
            }

            if ($this->filled('trigger_product_id') && (int) $this->input('trigger_product_id') === (int) $this->input('suggested_product_id')) {
                $v->errors()->add('suggested_product_id', 'A product cannot suggest itself.');
            }
        }];
    }
}
