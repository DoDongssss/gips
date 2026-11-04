<?php

namespace App\Http\Requests\Menu;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CategoryBulkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'action' => ['required', Rule::in(['hide', 'show', 'delete'])],
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:categories,id'],
        ];
    }
}
