<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route permissions are enforced by the permission: middleware on UserController.
        // Here we only protect superadmin accounts from everyone else.
        /** @var User|null $target */
        $target = $this->route('user');

        return ! ($target
            && $target->hasRole('superadmin')
            && ! $this->user()->hasRole('superadmin'));
    }

    protected function prepareForValidation(): void
    {
        // An unchecked checkbox sends nothing, so default it to false.
        $this->merge(['is_active' => $this->boolean('is_active')]);
    }

    public function rules(): array
    {
        /** @var User|null $user */
        $user = $this->route('user');
        $creating = $user === null;
        $roleLocked = $user && ($user->is($this->user()) || $user->hasRole('superadmin'));

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required', 'string', 'lowercase', 'email', 'max:255',
                Rule::unique(User::class)->ignore($user),
            ],
            'password' => [$creating ? 'required' : 'nullable', 'string', Password::defaults()],
            // PINs are hashed, so they cannot be unique. Staff pick their name first, then enter the PIN.
            'pin' => ['nullable', 'digits_between:4,6'],
            'role' => [
                $roleLocked ? 'nullable' : 'required',
                Rule::in(Role::where('name', '!=', 'superadmin')->pluck('name')->all()),
            ],
            'is_active' => ['boolean'],
        ];
    }

    /** Messages shown to staff (they appear in the toast and under the field). */
    public function messages(): array
    {
        return [
            'pin.digits_between' => 'The PIN must be 4 to 6 digits.',
            'role.required' => 'Please select a role.',
            'role.in' => 'That role cannot be assigned.',
            'email.unique' => 'That email is already used by another account.',
        ];
    }
}