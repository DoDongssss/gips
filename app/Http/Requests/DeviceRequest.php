<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DeviceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // the controller's permission middleware decides
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'station_id' => ['required', 'integer', Rule::exists('stations', 'id')],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
