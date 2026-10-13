<?php

namespace App\Http\Requests\Orders;

use Illuminate\Foundation\Http\FormRequest;

/** One refund against one payment, with a reason and, for staff who cannot refund alone, a manager's approval. */
class RefundRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payment_id' => ['required', 'integer'],
            'amount_cents' => ['required', 'integer', 'min:1', 'max:1000000000'],
            'reason' => ['required', 'string', 'max:255'],
            'approval' => ['nullable', 'array'],
            'approval.user_id' => ['required_with:approval', 'integer'],
            'approval.pin' => ['required_with:approval', 'string', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return ['reason.required' => 'Please give a reason.'];
    }
}
