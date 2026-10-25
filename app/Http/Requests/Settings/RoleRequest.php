<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // permission:role.manage on the controller
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('name'))) {
            $this->merge(['name' => strtolower(trim($this->input('name')))]);
        }
    }

    public function rules(): array
    {
        return [
            // Lowercase letters, numbers, dash and underscore: it is the role's identifier ("shift-lead").
            'name' => ['required', 'string', 'min:2', 'max:40', 'regex:/^[a-z][a-z0-9_-]*$/',
                Rule::unique('roles', 'name')->where('guard_name', 'web')->ignore($this->route('role')?->id)],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')->where('guard_name', 'web')],
        ];
    }

    public function messages(): array
    {
        return [
            'name.regex' => 'Use lowercase letters, numbers, dash or underscore, starting with a letter (for example shift-lead).',
        ];
    }
}
