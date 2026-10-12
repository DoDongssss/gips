<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateConfigurationRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The configuration.update permission is enforced by the permission: middleware on ConfigurationController.
        return true;
    }

    /** The field definitions for the group in the URL, or a 404 for an unknown group. */
    private function fields(): array
    {
        $fields = config('configuration.groups.'.$this->route('group').'.fields');

        abort_if($fields === null, 404);

        return $fields;
    }

    protected function prepareForValidation(): void
    {
        // An unchecked checkbox sends nothing, so treat a missing boolean as false.
        $booleans = [];

        foreach ($this->fields() as $key => $field) {
            if ($field['type'] === 'bool') {
                $booleans[$key] = $this->boolean($key);
            }
        }

        $this->merge($booleans);
    }

    public function rules(): array
    {
        return collect($this->fields())
            ->map(fn (array $field) => $field['rules'])
            ->all();
    }

    /** Friendly names in error messages, taken from the field labels. */
    public function attributes(): array
    {
        return collect($this->fields())
            ->map(fn (array $field) => mb_strtolower($field['label']))
            ->all();
    }
}