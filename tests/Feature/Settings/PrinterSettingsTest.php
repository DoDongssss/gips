<?php

use App\Models\User;
use App\Services\PrinterSettingsService;
use Database\Seeders\System\PermissionSeeder;
use Database\Seeders\System\RoleSeeder;

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
    $response = $this->actingAs(psAdmin())->get('/settings/printer');

    expect($response->status())->toBe(200);

    $response->assertInertia(fn ($page) => $page
        ->where('settings.printer_connection', 'browser')
        ->where('settings.printer_paper_width', 80)
        ->where('settings.printer_auto_print', true)
        ->has('connections')->has('business'));

    $settings = app(PrinterSettingsService::class)->all();

    expect($settings['printer_connection'])->toBe('browser')
        ->and($settings['printer_paper_width'])->toBe(80);
    expect($settings['printer_auto_print'])->toBeTrue();
    expect($settings['printer_copies'])->toBe(1);
});

it('saves the settings and hands them back with the right types', function () {
    $this->actingAs(psAdmin())->put('/settings/printer', psPayload())->assertSessionHasNoErrors();

    $saved = app(PrinterSettingsService::class)->all();

    expect($saved)->toMatchArray([
        'printer_connection' => 'bluetooth', 'printer_paper_width' => 58, 'printer_copies' => 2,
        'printer_serial_baud' => 115200, 'printer_auto_print' => false, 'printer_open_drawer' => true,
    ]);
    expect($saved['printer_name'])->toBe('Counter');
    expect($saved['printer_open_drawer'])->toBeTrue();
});

it('refuses an unknown connection, a bad paper width and too many copies', function () {
    $admin = psAdmin();

    $connection = $this->actingAs($admin)->put('/settings/printer', psPayload(['printer_connection' => 'telepathy']));
    expect($connection->status())->toBe(302);
    expect($connection->getSession()->get('errors')['default']['messages']['printer_connection'][0])
        ->toBe('The selected printer connection is invalid.');

    $width = $this->actingAs($admin)->put('/settings/printer', psPayload(['printer_paper_width' => 72]));
    expect($width->status())->toBe(302);
    expect($width->getSession()->get('errors')['default']['messages']['printer_paper_width'])->not->toBeEmpty();

    $copies = $this->actingAs($admin)->put('/settings/printer', psPayload(['printer_copies' => 9]));
    expect($copies->status())->toBe(302);
    expect($copies->getSession()->get('errors')['default']['messages']['printer_copies'])->not->toBeEmpty();
});

it('lets only people with setting.update change the printer', function () {
    $viewer = psWith('setting.view');

    expect($this->actingAs($viewer)->get('/settings/printer')->status())->toBe(200);
    expect($this->actingAs($viewer)->put('/settings/printer', psPayload())->status())->toBe(403);
});

it('lets the register read the settings without opening the settings page', function () {
    $cashier = psWith('order.create');

    $register = $this->actingAs($cashier)->getJson('/api/v1/pos/printer');
    $settingsPage = $this->actingAs($cashier)->get('/settings/printer');
    $blocked = $this->actingAs(psWith('menu.view'))->getJson('/api/v1/pos/printer');

    expect($register->status())->toBe(200);
    expect($register->json('data.printer_connection'))->toBe('browser');
    expect($settingsPage->status())->toBe(403);
    expect($blocked->status())->toBe(403);
});
