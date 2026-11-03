<?php

namespace App\Http\Requests\Orders;

use Illuminate\Foundation\Http\FormRequest;

/** Cancel and void: a reason, plus an optional manager approval for staff who cannot void alone. */
class OrderActionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
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
