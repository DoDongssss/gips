<?php

namespace App\Http\Requests;

use App\Enums\StationType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // the controller's permission middleware decides
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:80', Rule::unique('stations', 'name')->ignore($this->route('station'))],
            'type' => ['required', Rule::enum(StationType::class)],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'between:0,9999'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
        ];
    }
}
