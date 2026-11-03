<?php

use App\Http\Middleware\RequireTwoFactor;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Http\Request;

beforeEach(fn () => $this->seed([PermissionSeeder::class, RoleSeeder::class]));

function runTwoFactor(User $user, string $path): Illuminate\Http\Response|Illuminate\Http\RedirectResponse
{
    $request = Request::create($path);
    $request->setUserResolver(fn () => $user);

    return (new RequireTwoFactor)->handle($request, fn () => response('ok'));
}

it('sends an owner without 2FA to the setup page when it is required', function () {
    config(['security.require_2fa' => true]);
    $owner = User::factory()->create(['is_active' => true, 'two_factor_confirmed_at' => null]);
    $owner->assignRole('owner');

    $response = runTwoFactor($owner, '/dashboard');

    expect($response->getStatusCode())->toBe(302)->and($response->headers->get('Location'))->toContain(config('security.two_factor_setup_path'));
    expect(runTwoFactor($owner, '/'.config('security.two_factor_setup_path'))->getContent())->toBe('ok');
});

it('lets an owner with 2FA, and a cashier, straight through', function () {
    config(['security.require_2fa' => true]);

    $owner = User::factory()->create(['is_active' => true, 'two_factor_confirmed_at' => now()]);
    $owner->assignRole('owner');
    $cashier = User::factory()->create(['is_active' => true, 'two_factor_confirmed_at' => null]);
    $cashier->assignRole('cashier');

    expect(runTwoFactor($owner, '/dashboard')->getContent())->toBe('ok');
    expect(runTwoFactor($cashier, '/dashboard')->getContent())->toBe('ok');
});

it('does nothing while the requirement is switched off', function () {
    config(['security.require_2fa' => false]);
    $owner = User::factory()->create(['is_active' => true, 'two_factor_confirmed_at' => null]);
    $owner->assignRole('owner');

    expect(runTwoFactor($owner, '/dashboard')->getContent())->toBe('ok');
});
