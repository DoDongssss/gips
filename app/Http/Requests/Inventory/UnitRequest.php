<?php

namespace App\Http\Requests\Inventory;

use App\Enums\UnitType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        // inventory.adjust is enforced by the permission: middleware on UnitController.
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:50'],
            'abbreviation' => ['required', 'string', 'max:10', Rule::unique('units', 'abbreviation')->ignore($this->route('unit')?->id)],
            'type' => ['required', Rule::enum(UnitType::class)],
        ];
    }
}
