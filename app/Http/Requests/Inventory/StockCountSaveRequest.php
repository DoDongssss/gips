<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class StockCountSaveRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** counted: { '<ingredient_id>': '12.5' | null }. Blank clears the line. */
    public function rules(): array
    {
        return [
            'counted' => ['required', 'array'],
            'counted.*' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
        ];
    }
}
