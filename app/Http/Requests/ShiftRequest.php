<?php

namespace App\Http\Requests;

use App\Enums\CashMovementType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Open a shift, record a cash movement or close a shift: one request, rules chosen by the route. */
class ShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return match ($this->route()->getName()) {
            'shifts.store' => [
                'opening_cash_cents' => ['required', 'integer', 'min:0', 'max:1000000000'],
            ],
            'shifts.movements.store' => [
                'type' => ['required', Rule::enum(CashMovementType::class)],
                'amount_cents' => ['required', 'integer', 'min:1', 'max:1000000000'],
                'reason' => ['required', 'string', 'max:255'],
            ],
            default => [
                'counted_cash_cents' => ['required', 'integer', 'min:0', 'max:1000000000'],
                'notes' => ['nullable', 'string', 'max:1000'],
            ],
        };
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'reason.required' => 'Please give a reason.',
            'opening_cash_cents.required' => 'Count the cash in the drawer first.',
            'counted_cash_cents.required' => 'Count the cash in the drawer first.',
        ];
    }
}
