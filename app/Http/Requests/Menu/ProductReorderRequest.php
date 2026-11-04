<?php

namespace App\Http\Requests\Menu;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductReorderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['required', 'integer', Rule::exists('categories', 'id')->whereNull('deleted_at')],
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:products,id'],
        ];
    }
}
