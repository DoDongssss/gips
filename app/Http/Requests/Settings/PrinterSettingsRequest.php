<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class PrinterSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // permission:setting.update on the controller
    }

    public function rules(): array
    {
        return collect(config('printer.fields'))->map(fn (array $field) => $field['rules'])->all();
    }
}
