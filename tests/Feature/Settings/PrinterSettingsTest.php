<?php

use App\Models\User;
use App\Services\PrinterSettingsService;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;

beforeEach(fn () => $this->seed([PermissionSeeder::class, RoleSeeder::class]));

function psAdmin(): User
{
    return User::factory()->create(['is_active' => true])->assignRole('superadmin');
}

function psWith(string ...$permissions): User
{
    return User::factory()->create(['is_active' => true])->givePermissionTo($permissions);
}

function psPayload(array $over = []): array
{
    return $over + [
        'printer_connection' => 'bluetooth', 'printer_name' => 'Counter', 'printer_paper_width' => 58, 'printer_copies' => 2,
        'printer_serial_baud' => 115200, 'printer_auto_print' => false, 'printer_open_drawer' => true,
    ];
}

it('starts with sensible defaults before anything is saved', function () {
    $this->actingAs(psAdmin())->get('/settings/printer')->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('settings.printer_connection', 'browser')
            ->where('settings.printer_paper_width', 80)
            ->where('settings.printer_auto_print', true)
            ->has('connections')->has('business'));
});

it('saves the settings and hands them back with the right types', function () {
    $this->actingAs(psAdmin())->put('/settings/printer', psPayload())->assertSessionHasNoErrors();

    expect(app(PrinterSettingsService::class)->all())->toMatchArray([
        'printer_connection' => 'bluetooth', 'printer_paper_width' => 58, 'printer_copies' => 2,
        'printer_serial_baud' => 115200, 'printer_auto_print' => false, 'printer_open_drawer' => true,
    ]);
});

it('refuses an unknown connection, a bad paper width and too many copies', function () {
    $admin = psAdmin();

    $this->actingAs($admin)->put('/settings/printer', psPayload(['printer_connection' => 'telepathy']))->assertSessionHasErrors('printer_connection');
    $this->actingAs($admin)->put('/settings/printer', psPayload(['printer_paper_width' => 72]))->assertSessionHasErrors('printer_paper_width');
    $this->actingAs($admin)->put('/settings/printer', psPayload(['printer_copies' => 9]))->assertSessionHasErrors('printer_copies');
});

it('lets only people with setting.update change the printer', function () {
    $viewer = psWith('setting.view');

    $this->actingAs($viewer)->get('/settings/printer')->assertOk();
    $this->actingAs($viewer)->put('/settings/printer', psPayload())->assertForbidden();
});

it('lets the register read the settings without opening the settings page', function () {
    $cashier = psWith('order.create');

    $this->actingAs($cashier)->getJson('/api/v1/pos/printer')->assertOk()->assertJsonPath('data.printer_connection', 'browser');
    $this->actingAs($cashier)->get('/settings/printer')->assertForbidden();
    $this->actingAs(psWith('menu.view'))->getJson('/api/v1/pos/printer')->assertForbidden();
});
