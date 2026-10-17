<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class StockCountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** Leave ingredient_ids out to count every active ingredient. */
    public function rules(): array
    {
        return [
            'ingredient_ids' => ['nullable', 'array'],
            'ingredient_ids.*' => ['integer', 'exists:ingredients,id'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
