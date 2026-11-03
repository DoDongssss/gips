<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IngredientCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('ingredient_categories', 'name')->ignore($this->route('category')?->id)],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
