<?php

namespace App\Http\Requests;

use App\Models\Device;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DeviceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // device.manage on the controller
    }

    public function rules(): array
    {
        $creating = $this->isMethod('post');

        return [
            'name' => ['required', 'string', 'max:100'],
            'type' => [$creating ? 'required' : 'prohibited', Rule::in([Device::KIOSK, 'pos', 'kds'])],
            // Empty on a kitchen screen means "all stations".
            'station_id' => ['nullable', 'integer', 'exists:stations,id'],
            'is_active' => [$creating ? 'prohibited' : 'required', 'boolean'],

            'settings' => ['sometimes', 'array'],
            'settings.language' => ['sometimes', 'string', 'max:8'],
            'settings.theme' => ['nullable', 'string', 'max:50'],
            'settings.payment_mode' => ['sometimes', Rule::in(['pay_at_counter'])], // pay_at_kiosk arrives with a payment provider
            'settings.idle_timeout_seconds' => ['sometimes', 'integer', 'min:15', 'max:600'],
            'settings.upsell_enabled' => ['sometimes', 'boolean'],
            'settings.large_text' => ['sometimes', 'boolean'],
            'settings.is_out_of_service' => ['sometimes', 'boolean'],
            'settings.welcome_message' => ['nullable', 'string', 'max:150'],
        ];
    }
}
