<?php

namespace App\Http\Requests\Menu;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $product = $this->route('product');

        return [
            'category_id' => ['required', 'integer', Rule::exists('categories', 'id')->whereNull('deleted_at')],
            'station_id' => ['nullable', 'integer', Rule::exists('stations', 'id')],
            'name' => ['required', 'string', 'max:150'],
            'sku' => ['nullable', 'string', 'max:64', Rule::unique('products', 'sku')->ignore($product?->id)],
            'description' => ['nullable', 'string', 'max:2000'],
            'base_price_cents' => ['required', 'integer', 'min:0', 'max:100000000'],
            'is_taxable' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'prep_time_seconds' => ['nullable', 'integer', 'min:0', 'max:86400'],
        ];
    }

    public function messages(): array
    {
        return [
            'category_id.required' => 'Please choose a category.',
            'base_price_cents.required' => 'Please enter a price.',
            'sku.unique' => 'That SKU is already used by another product.',
        ];
    }
}
