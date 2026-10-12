<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PinLoginController extends Controller
{
    /** Roles that must always sign in with email and password. */
    private const PASSWORD_ONLY_ROLES = ['superadmin', 'owner'];

    private const MAX_USER_ATTEMPTS = 5;

    private const MAX_IP_ATTEMPTS = 20;

    private const LOCKOUT_SECONDS = 60;

    public function create(): Response
    {
        return Inertia::render('pin-login', [
            'staff' => $this->eligibleUsers()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->getRoleNames()->first(),
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer'],
            'pin' => ['required', 'digits_between:4,6'],
        ], [
            'pin.required' => 'Enter your PIN.',
            'pin.digits_between' => 'Your PIN must be 4 to 6 digits.',
        ]);

        $userKey = 'pin-login:user:'.$data['user_id'].'|'.$request->ip();
        $ipKey = 'pin-login:ip:'.$request->ip();

        $this->ensureNotLocked($userKey, self::MAX_USER_ATTEMPTS);
        $this->ensureNotLocked($ipKey, self::MAX_IP_ATTEMPTS);

        $user = $this->eligibleUsers()->find($data['user_id']);

        // The same message for every failure, so nobody learns which accounts exist.
        if ($user === null || ! Hash::check($data['pin'], (string) $user->pin)) {
            RateLimiter::hit($userKey, self::LOCKOUT_SECONDS);
            RateLimiter::hit($ipKey, self::LOCKOUT_SECONDS);

            Audit::record(
                'auth',
                'pin_login_failed',
                $user ? "Failed PIN sign-in for {$user->name}" : 'Failed PIN sign-in',
                $user,
            );

            throw ValidationException::withMessages(['pin' => 'That PIN is not correct.']);
        }

        RateLimiter::clear($userKey);

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard'));
    }

    /** Active staff with a PIN, excluding roles that must use a password. */
    private function eligibleUsers()
    {
        return User::query()
            ->where('is_active', true)
            ->whereNotNull('pin')
            ->whereDoesntHave('roles', fn ($q) => $q->whereIn('name', self::PASSWORD_ONLY_ROLES));
    }

    private function ensureNotLocked(string $key, int $max): void
    {
        if (! RateLimiter::tooManyAttempts($key, $max)) {
            return;
        }

        $seconds = RateLimiter::availableIn($key);

        throw ValidationException::withMessages([
            'pin' => "Too many attempts. Try again in {$seconds} seconds.",
        ]);
    }
}