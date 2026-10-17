<?php

namespace App\Http\Requests\Inventory;

use App\Enums\ModifierAction;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ModifierRecipeRequest extends FormRequest
{
    use ChecksUnitConversion;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => ['present', 'array', 'max:30'],
            'items.*.ingredient_id' => ['required', 'exists:ingredients,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0', 'max:9999999999'],
            'items.*.unit_id' => ['required', 'exists:units,id'],
            'items.*.action' => ['required', Rule::enum(ModifierAction::class)],
            'items.*.replaces_ingredient_id' => ['nullable', 'exists:ingredients,id'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            foreach ($this->input('items') as $i => $item) {
                if ($item['action'] === ModifierAction::Replace->value && empty($item['replaces_ingredient_id'])) {
                    $validator->errors()->add("items.{$i}.replaces_ingredient_id", 'Choose the ingredient this replaces.');
                }

                if (! $this->convertsToBase($item['ingredient_id'], $item['unit_id'])) {
                    $validator->errors()->add("items.{$i}.unit_id", 'This unit cannot be converted to the ingredient base unit.');
                }
            }
        }];
    }
}
