<?php

use App\Enums\OrderChannel;
use App\Models\Device;
use App\Models\User;
use App\Services\Devices\DevicePairingService;
use App\Services\Orders\OrderService;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/*
 | Performance guard (Phase 8, "check indexes and N+1 queries").
 | A page that runs one extra query for every product or order gets slower as the shop grows.
 | Each test measures the number of database queries with a few records, adds many more, and measures again:
 | the count must stay (almost) the same. Fixtures follow tests/Feature/Phase8/CounterFlowTest.php.
 */

beforeEach(fn () => $this->seed([PermissionSeeder::class, RoleSeeder::class]));

const QB_TOLERANCE = 2;

/** Queries run by $call, with a warmed-up app and empty caches (so a cached menu cannot hide a problem). */
function qbQueries(callable $call): int
{
    $call();
    Cache::flush();

    DB::flushQueryLog();
    DB::enableQueryLog();
    $call();
    $count = count(DB::getQueryLog());
    DB::disableQueryLog();

    return $count;
}

function qbProducts(int $categories, int $perCategory): array
{
    $ids = [];

    for ($c = 0; $c < $categories; $c++) {
        $category = DB::table('categories')->insertGetId(['name' => 'Cat '.uniqid(), 'slug' => 'cat-'.uniqid(), 'sort_order' => $c, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);

        for ($p = 0; $p < $perCategory; $p++) {
            $name = 'Item '.uniqid();
            $ids[] = DB::table('products')->insertGetId([
                'category_id' => $category, 'name' => $name, 'slug' => str()->slug($name), 'base_price_cents' => 10000,
                'is_taxable' => true, 'is_available' => true, 'is_active' => true, 'sort_order' => $p, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    return $ids;
}

function qbCashier(): User
{
    return User::factory()->create(['is_active' => true])->assignRole('cashier');
}

it('loads the register menu in the same number of queries however many products there are', function () {
    $cashier = qbCashier();
    $this->actingAs($cashier);

    qbProducts(2, 2);
    $few = qbQueries(fn () => $this->getJson('/api/v1/menu')->assertOk());

    qbProducts(10, 6);
    $many = qbQueries(fn () => $this->getJson('/api/v1/menu')->assertOk());

    expect($many)->toBeLessThanOrEqual($few + QB_TOLERANCE);
});

it('loads the kiosk menu in the same number of queries however many products there are', function () {
    [, $code] = app(DevicePairingService::class)->register('Kiosk', Device::KIOSK, null, null);
    [, $token] = app(DevicePairingService::class)->pair($code, '127.0.0.1', '1.0');
    $get = fn () => $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/v1/kiosk/menu')->assertOk();

    qbProducts(2, 2);
    $few = qbQueries($get);

    qbProducts(10, 6);
    $many = qbQueries($get);

    expect($many)->toBeLessThanOrEqual($few + QB_TOLERANCE);
});

it('lists waiting kiosk orders in the same number of queries however many orders there are', function () {
    $cashier = qbCashier();
    $product = qbProducts(1, 1)[0];
    $place = fn () => app(OrderService::class)->create(['type' => 'takeout', 'items' => [['product_id' => $product, 'quantity' => 1]]], $cashier, OrderChannel::Kiosk, null, confirm: false);
    $list = fn () => $this->actingAs($cashier)->getJson('/api/v1/pos/kiosk-orders')->assertOk();

    foreach (range(1, 2) as $i) {
        $place();
    }
    $few = qbQueries($list);

    foreach (range(1, 15) as $i) {
        $place();
    }
    $many = qbQueries($list);

    expect($many)->toBeLessThanOrEqual($few + QB_TOLERANCE);
});

it('shows one cashier\'s own orders in the same number of queries however many orders there are', function () {
    $cashier = qbCashier();
    $product = qbProducts(1, 1)[0];
    $place = fn () => app(OrderService::class)->create(['type' => 'takeout', 'items' => [['product_id' => $product, 'quantity' => 1]]], $cashier);
    $list = fn () => $this->actingAs($cashier)->getJson('/api/v1/pos/my-orders')->assertOk();

    foreach (range(1, 2) as $i) {
        $place();
    }
    $few = qbQueries($list);

    foreach (range(1, 15) as $i) {
        $place();
    }
    $many = qbQueries($list);

    expect($many)->toBeLessThanOrEqual($few + QB_TOLERANCE);
});