<?php

namespace App\Http\Requests\Customers;

use Illuminate\Foundation\Http\FormRequest;

class AdjustCustomerLoyaltyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('customer.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'points' => ['required', 'integer', 'not_in:0', 'min:-1000000', 'max:1000000'],
            'note' => ['required', 'string', 'min:3', 'max:255'],
        ];
    }
}
