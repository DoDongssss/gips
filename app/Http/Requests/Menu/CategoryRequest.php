<?php

namespace App\Http\Requests\Menu;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $category = $this->route('category');

        return [
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['required', 'boolean'],
            'station_id' => ['nullable', 'integer', Rule::exists('stations', 'id')],
            'image' => ['nullable', 'image', 'max:4096', 'mimes:jpeg,png,webp'],
            'remove_image' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Please enter a category name.',
        ];
    }
}
