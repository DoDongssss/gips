<?php

namespace App\Http\Requests\Menu;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ModifierGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'selection_type' => ['required', 'in:single,multiple'],
            'is_required' => ['required', 'boolean'],
            'min_select' => ['nullable', 'integer', 'min:0', 'max:50'],
            'max_select' => ['nullable', 'integer', 'min:1', 'max:50'],
            'is_active' => ['required', 'boolean'],
            'modifiers' => ['required', 'array', 'min:1', 'max:50'],
            'modifiers.*.id' => ['nullable', 'integer'],
            'modifiers.*.name' => ['required', 'string', 'max:100'],
            'modifiers.*.price_delta_cents' => ['required', 'integer', 'min:-100000000', 'max:100000000'],
            'modifiers.*.is_default' => ['boolean'],
            'modifiers.*.is_available' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'modifiers.required' => 'Add at least one option to the group.',
            'modifiers.min' => 'Add at least one option to the group.',
            'modifiers.*.name.required' => 'Every option needs a name.',
        ];
    }

    /** @return array<int, \Closure> */
    public function after(): array
    {
        return [function (Validator $validator) {
            $data = $this->all();
            $modifiers = collect($data['modifiers'] ?? []);
            $defaults = $modifiers->filter(fn ($m) => ! empty($m['is_default']))->count();

            if (($data['selection_type'] ?? null) === 'single') {
                if ($defaults > 1) {
                    $validator->errors()->add('modifiers', 'A single-choice group can have only one default option.');
                }

                return;
            }

            $min = (int) ($data['min_select'] ?? 0);
            $max = $data['max_select'] ?? null;

            if ($max !== null && $max !== '' && $min > (int) $max) {
                $validator->errors()->add('min_select', 'The minimum cannot be higher than the maximum.');
            }

            if ($min > $modifiers->count()) {
                $validator->errors()->add('min_select', 'The minimum is higher than the number of options.');
            }

            if ($max !== null && $max !== '' && $defaults > (int) $max) {
                $validator->errors()->add('modifiers', 'More defaults are selected than the maximum allows.');
            }
        }];
    }
}
