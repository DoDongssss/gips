<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class TaxRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100', Rule::unique('taxes', 'name')->ignore($this->route('tax')?->id)],
            // What the person types: 12 means 12%. Stored as 0.1200.
            'rate_percent' => ['required', 'numeric', 'between:0,100'],
            'is_inclusive' => ['required', 'boolean'],
            'is_default' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    /** @return array<int, \Closure> */
    public function after(): array
    {
        return [function (Validator $validator) {
            $tax = $this->route('tax');

            if ($this->boolean('is_default') && ! $this->boolean('is_active')) {
                $validator->errors()->add('is_default', 'The default tax must be active.');
            }

            if ($tax?->is_default && ! $this->boolean('is_default')) {
                $validator->errors()->add('is_default', 'Make another tax the default instead of switching this one off.');
            }
        }];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'rate_percent.between' => 'The rate must be between 0 and 100.',
        ];
    }
}
