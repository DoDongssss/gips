<?php

namespace App\Http\Requests\Menu;

use Illuminate\Foundation\Http\FormRequest;

class SyncVariantsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'variants' => ['present', 'array', 'max:12'],
            'variants.*.id' => ['nullable', 'integer'],
            'variants.*.name' => ['required', 'string', 'max:80', 'distinct:ignore_case'],
            'variants.*.price_cents' => ['required', 'integer', 'min:0', 'max:100000000'],
            'variants.*.is_default' => ['boolean'],
            'variants.*.is_active' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'variants.*.name.required' => 'Every size needs a name.',
            'variants.*.name.distinct' => 'Two sizes have the same name.',
            'variants.*.price_cents.required' => 'Every size needs a price.',
        ];
    }
}
