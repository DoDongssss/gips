<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IngredientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'sku' => ['nullable', 'string', 'max:255', Rule::unique('ingredients', 'sku')->ignore($this->route('ingredient')?->id)],
            'ingredient_category_id' => ['nullable', 'exists:ingredient_categories,id'],
            'base_unit_id' => ['required', 'exists:units,id'],
            'purchase_unit_id' => ['nullable', 'exists:units,id'],
            'reorder_level' => ['required', 'numeric', 'min:0', 'max:9999999999'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
