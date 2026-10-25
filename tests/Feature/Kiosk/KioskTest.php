<?php

use App\Models\Device;
use App\Models\KioskScreen;
use App\Models\Order;
use App\Models\User;
use App\Services\Devices\DevicePairingService;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\DB;

// Product fixture follows the DB Structure doc; add NOT NULL columns of your own table in kioskProduct() only.
// The "kiosk token cannot call a staff route" test needs BlockDeviceTokensOutsideKiosk registered (see APPLY-kiosk.md).

beforeEach(fn () => $this->seed([PermissionSeeder::class, RoleSeeder::class]));

function kioskProduct(string $name = 'Latte', int $price = 12000, bool $available = true): int
{
    $category = DB::table('categories')->first()?->id ?? DB::table('categories')->insertGetId(['name' => 'Coffee', 'slug' => 'coffee', 'sort_order' => 0, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);

    return DB::table('products')->insertGetId([
        'category_id' => $category, 'name' => $name, 'slug' => str()->slug($name).uniqid(), 'base_price_cents' => $price,
        'is_taxable' => true, 'is_available' => $available, 'is_active' => true, 'sort_order' => 0, 'created_at' => now(), 'updated_at' => now(),
    ]);
}

/** A paired kiosk and its plain token. */
function pairedKiosk(): array
{
    [$device, $code] = app(DevicePairingService::class)->register('Kiosk 1', Device::KIOSK, null, null);
    [, $token] = app(DevicePairingService::class)->pair($code, '127.0.0.1', '1.0');

    return [$device->fresh(), $token];
}

function startSession(string $token): string
{
    return test()->withToken($token)->postJson('/api/v1/kiosk/sessions')->assertCreated()->json('data.session_uuid');
}

function kioskCart(int $productId, string $session, array $extra = []): array
{
    return ['session_uuid' => $session, 'type' => 'takeout', 'items' => [['product_id' => $productId, 'quantity' => 2]]] + $extra;
}

it('pairs with a one-time code and rejects a wrong or reused one', function () {
    [$device, $code] = app(DevicePairingService::class)->register('Kiosk 1', Device::KIOSK, null, null);

    $this->postJson('/api/v1/kiosk/pair', ['code' => 'WRONG123'])->assertStatus(422);

    $this->postJson('/api/v1/kiosk/pair', ['code' => $code])->assertOk()
        ->assertJsonPath('data.abilities', ['menu:read', 'orders:create'])
        ->assertJsonStructure(['data' => ['token', 'device', 'settings']]);

    $this->postJson('/api/v1/kiosk/pair', ['code' => $code])->assertStatus(422); // single use
    expect($device->fresh()->paired_at)->not->toBeNull()->and($device->fresh()->pairing_code_hash)->toBeNull();
});

it('keeps a kiosk token away from staff routes and staff away from kiosk routes', function () {
    [, $token] = pairedKiosk();

    expect($this->withToken($token)->getJson('/api/v1/menu')->status())->toBeIn([401, 403]); // a staff route: refused either way
    $this->withToken($token)->getJson('/api/v1/kiosk/menu')->assertOk();    // its own route

    $this->actingAs(User::factory()->create()->assignRole('owner'));
    $this->getJson('/api/v1/kiosk/menu')->assertForbidden();
});

it('creates a pay-at-counter order once, however many times the kiosk retries', function () {
    [$device, $token] = pairedKiosk();
    $product = kioskProduct();
    $session = startSession($token);
    $cart = kioskCart($product, $session);

    $first = $this->withToken($token)->postJson('/api/v1/kiosk/orders', $cart)->assertCreated();
    $again = $this->withToken($token)->postJson('/api/v1/kiosk/orders', $cart)->assertOk();

    expect($again->json('data.order_number'))->toBe($first->json('data.order_number'))
        ->and(Order::count())->toBe(1);

    $order = Order::first();
    expect($order->channel->value)->toBe('kiosk')->and($order->status->value)->toBe('open')
        ->and($order->payment_status->value)->toBe('unpaid')->and($order->device_id)->toBe($device->id);
    expect($first->json('data.pay_at'))->toBe('counter');
});

it('ignores prices and discounts a kiosk tries to send', function () {
    [, $token] = pairedKiosk();
    $product = kioskProduct(price: 12000);

    $cart = kioskCart($product, startSession($token), [
        'discounts' => [['discount_id' => 1]], 'approval' => ['user_id' => 1, 'pin' => '1234'],
    ]);
    $cart['items'][0]['price_override'] = ['unit_price_cents' => 1, 'reason' => 'cheap'];

    $this->withToken($token)->postJson('/api/v1/kiosk/orders', $cart)->assertCreated()->assertJsonPath('data.subtotal_cents', 24000);
});

it('flags a senior or PWD order for ID check without discounting it', function () {
    [, $token] = pairedKiosk();
    $cart = kioskCart(kioskProduct(), startSession($token), ['senior_pwd' => true]);

    $this->withToken($token)->postJson('/api/v1/kiosk/orders', $cart)->assertCreated()->assertJsonPath('data.requires_verification', true);

    expect((bool) Order::first()->requires_verification)->toBeTrue()->and((int) Order::first()->discount_cents)->toBe(0);
});

it('refuses sessions and orders while the kiosk is out of service', function () {
    [$device, $token] = pairedKiosk();
    $session = startSession($token);
    $device->settings->update(['is_out_of_service' => true]);

    $this->withToken($token)->postJson('/api/v1/kiosk/sessions')->assertStatus(423);
    $this->withToken($token)->postJson('/api/v1/kiosk/orders', kioskCart(kioskProduct(), $session))->assertStatus(423);
    $this->withToken($token)->getJson('/api/v1/kiosk/status')->assertOk()->assertJsonPath('data.settings.is_out_of_service', true);
});

it('cancels unpaid kiosk orders after the configured time', function () {
    [, $token] = pairedKiosk();
    $this->withToken($token)->postJson('/api/v1/kiosk/orders', kioskCart(kioskProduct(), startSession($token)))->assertCreated();

    $this->artisan('kiosk:maintain')->assertSuccessful();
    expect(Order::first()->status->value)->toBe('open'); // still inside the window

    $this->travel(config('kiosk.unpaid_expiry_minutes') + 1)->minutes();
    $this->artisan('kiosk:maintain')->assertSuccessful();

    expect(Order::first()->status->value)->toBe('cancelled');
});

it('suggests upsell products for the cart and skips sold-out ones', function () {
    [, $token] = pairedKiosk();
    $latte = kioskProduct('Latte');
    $croissant = kioskProduct('Croissant');
    $soldOut = kioskProduct('Muffin', available: false);

    foreach ([$croissant, $soldOut] as $i => $suggested) {
        DB::table('upsell_rules')->insert(['trigger_product_id' => $latte, 'suggested_product_id' => $suggested, 'channel' => 'kiosk', 'message' => 'Add a pastry?', 'priority' => 10 - $i, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
    }

    $this->withToken($token)->postJson('/api/v1/kiosk/upsell', ['product_ids' => [$latte]])->assertOk()
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.product_id', $croissant);

    $this->withToken($token)->postJson('/api/v1/kiosk/upsell', ['product_ids' => [$latte, $croissant]])->assertJsonCount(0, 'data');
});

it('shows only welcome screens that are on and inside their dates', function () {
    [, $token] = pairedKiosk();

    KioskScreen::create(['title' => 'Live', 'type' => 'promo', 'is_active' => true, 'sort_order' => 1]);
    KioskScreen::create(['title' => 'Off', 'type' => 'promo', 'is_active' => false, 'sort_order' => 2]);
    KioskScreen::create(['title' => 'Later', 'type' => 'promo', 'is_active' => true, 'sort_order' => 3, 'starts_at' => now()->addDay()]);
    KioskScreen::create(['title' => 'Ended', 'type' => 'promo', 'is_active' => true, 'sort_order' => 4, 'ends_at' => now()->subDay()]);

    $this->withToken($token)->getJson('/api/v1/kiosk/screens')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'Live');
});

it('records heartbeats and notifies managers once when a kiosk goes quiet', function () {
    [$device, $token] = pairedKiosk();
    $owner = User::factory()->create()->assignRole('owner');

    $this->withToken($token)->postJson('/api/v1/kiosk/heartbeat', ['status' => 'online', 'app_version' => '1.0.1'])->assertOk();
    expect(DB::table('kiosk_heartbeats')->count())->toBe(1);

    $this->travel(config('kiosk.offline_after_minutes') + 1)->minutes();
    $this->artisan('kiosk:maintain');
    $this->artisan('kiosk:maintain'); // a second run must not notify again

    expect($owner->notifications()->count())->toBe(1);
});

it('lets only device managers use the admin pages', function () {
    $this->withoutVite();

    $this->actingAs(User::factory()->create()->assignRole('manager'))->get('/kiosk/devices')->assertForbidden();
    $this->actingAs(User::factory()->create()->assignRole('owner'))->get('/kiosk/devices')->assertOk();
});