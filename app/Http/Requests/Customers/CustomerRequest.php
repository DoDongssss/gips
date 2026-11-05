<?php

namespace App\Http\Requests\Customers;

use App\Models\Customer;
use App\Services\Customers\CustomerService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('customer.manage') ?? false;
    }

    public function rules(): array
    {
        /** @var Customer|null $customer */
        $customer = $this->route('customer');

        $phoneRule = Rule::unique('customers', 'phone')->ignore($customer?->id);

        return [
            'name' => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30', $phoneRule],
            'email' => ['nullable', 'email', 'max:190'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('phone')) {
            return;
        }

        $normalized = app(CustomerService::class)->normalizePhone((string) $this->input('phone'));

        $this->merge([
            'phone' => $normalized,
        ]);
    }
}
