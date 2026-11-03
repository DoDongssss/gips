<?php

namespace App\Http\Requests\Kiosk;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ScreenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'type' => ['required', Rule::in(['welcome', 'promo', 'banner'])],
            'headline' => ['nullable', 'string', 'max:150'],
            'subtext' => ['nullable', 'string', 'max:300'],
            'image' => ['nullable', 'image', 'max:4096'],
            'remove_image' => ['sometimes', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:9999'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
