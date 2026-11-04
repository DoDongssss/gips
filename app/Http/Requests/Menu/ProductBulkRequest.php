<?php

namespace App\Http\Requests\Menu;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductBulkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'action' => ['required', Rule::in(['sold_out', 'available', 'hide', 'show', 'move_category', 'delete'])],
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:products,id'],
            'category_id' => ['required_if:action,move_category', 'integer', Rule::exists('categories', 'id')->whereNull('deleted_at')],
        ];
    }
}
