<?php

namespace App\Http\Requests\Orders;

use Illuminate\Foundation\Http\FormRequest;

class TakePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payments' => ['required', 'array', 'min:1', 'max:5'],
            'payments.*.method' => ['required', 'string', 'max:30'],
            'payments.*.amount_cents' => ['nullable', 'integer', 'min:1', 'max:1000000000'],
            'payments.*.tendered_cents' => ['nullable', 'integer', 'min:1', 'max:1000000000'],
            'payments.*.tip_cents' => ['nullable', 'integer', 'min:0', 'max:1000000000'],
            'payments.*.reference_no' => ['nullable', 'string', 'max:100'],
        ];
    }
}
