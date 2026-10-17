<?php

namespace App\Http\Requests\Inventory;

use App\Models\Unit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UnitConversionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from_unit_id' => ['required', 'exists:units,id', 'different:to_unit_id'],
            'to_unit_id' => ['required', 'exists:units,id'],
            'factor' => ['required', 'numeric', 'gt:0', 'max:9999999999'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $from = Unit::find($this->input('from_unit_id'));
            $to = Unit::find($this->input('to_unit_id'));

            // Weight can never convert to volume without a density. A count unit (bottle, box)
            // may convert to either, because it stands for a measured amount.
            if ($from->type !== $to->type && $from->type->value !== 'count' && $to->type->value !== 'count') {
                $validator->errors()->add('to_unit_id', 'These units measure different things.');
            }
        }];
    }
}
