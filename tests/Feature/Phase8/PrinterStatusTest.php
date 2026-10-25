<?php

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    Cache::flush();
});

function psAs(string ...$permissions): User
{
    $user = User::factory()->create(['is_active' => true]);
    $user->givePermissionTo(Permission::whereIn('name', $permissions)->get());

    return $user;
}

it('shows a register whose printer is offline to someone who manages devices', function () {
    $cashier = psAs('order.create');
    $manager = psAs('device.manage');

    $this->actingAs($cashier)->postJson('/api/v1/pos/printer-status', ['online' => false, 'message' => 'USB printer unplugged', 'connection' => 'usb'])->assertOk();

    $this->actingAs($manager)->getJson('/api/v1/pos/printer-alerts')->assertOk()
        ->assertJsonPath('data.count', 1)
        ->assertJsonPath('data.items.0.name', $cashier->name)
        ->assertJsonPath('data.items.0.message', 'USB printer unplugged');
});

it('clears the alert when the register reports the printer is back', function () {
    $cashier = psAs('order.create');
    $manager = psAs('device.manage');

    $this->actingAs($cashier)->postJson('/api/v1/pos/printer-status', ['online' => false])->assertOk();
    $this->actingAs($cashier)->postJson('/api/v1/pos/printer-status', ['online' => true])->assertOk();

    $this->actingAs($manager)->getJson('/api/v1/pos/printer-alerts')->assertJsonPath('data.count', 0);
});

it('forgets a register that stopped reporting, so a closed shop raises no alarm', function () {
    $cashier = psAs('order.create');
    $manager = psAs('device.manage');

    $this->actingAs($cashier)->postJson('/api/v1/pos/printer-status', ['online' => false])->assertOk();
    $this->travel(10)->minutes();

    $this->actingAs($manager)->getJson('/api/v1/pos/printer-alerts')->assertJsonPath('data.count', 0);
});

it('keeps both endpoints behind their permissions', function () {
    $this->postJson('/api/v1/pos/printer-status', ['online' => true])->assertUnauthorized();
    $this->actingAs(psAs('menu.view'))->postJson('/api/v1/pos/printer-status', ['online' => true])->assertForbidden();
    $this->actingAs(psAs('order.create'))->getJson('/api/v1/pos/printer-alerts')->assertForbidden();
});

it('rejects a status with no online flag', function () {
    $this->actingAs(psAs('order.create'))->postJson('/api/v1/pos/printer-status', [])->assertUnprocessable();
});
