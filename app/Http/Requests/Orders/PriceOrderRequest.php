<?php

namespace App\Http\Requests\Orders;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The cart. Note what is NOT here: no prices, no totals, no tax.
 * Any such field a client sends is simply never read.
 */
class PriceOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // permission: middleware on the controller does the check
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(['dine_in', 'takeout'])],
            'customer_name' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],

            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.variant_id' => ['nullable', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
            'items.*.modifiers' => ['nullable', 'array', 'max:30'],
            'items.*.modifiers.*' => ['integer'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],

            'discounts' => ['nullable', 'array', 'max:10'],
            'discounts.*.discount_id' => ['required', 'integer'],
            'discounts.*.item_index' => ['nullable', 'integer', 'min:0'],
            'discounts.*.id_number' => ['nullable', 'string', 'max:50'],

            // Manager approval for senior/PWD discounts when the cashier is not a manager.
            'approval' => ['nullable', 'array'],
            'approval.user_id' => ['required_with:approval', 'integer'],
            'approval.pin' => ['required_with:approval', 'string', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'Add at least one item to the order.',
            'items.min' => 'Add at least one item to the order.',
            'items.*.quantity.min' => 'Quantity must be at least 1.',
        ];
    }
}
