<?php

use App\Enums\OrderStatus;
use App\Enums\StockMovementType;
use App\Jobs\DeductStockForOrder;
use App\Models\Ingredient;
use App\Models\Order;
use App\Models\Product;
use App\Models\Recipe;
use App\Models\Unit;
use App\Models\User;
use App\Services\Inventory\StockReturnService;
use App\Services\Inventory\StockService;
use App\Services\Orders\OrderStatusService;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\UnitSeeder;
use Illuminate\Support\Facades\DB;

// Fixtures follow tests/Feature/Inventory/InventoryTest.php. Add NOT NULL columns of your own tables in the sr* helpers only.

beforeEach(fn () => $this->seed([PermissionSeeder::class, RoleSeeder::class, UnitSeeder::class]));

function srStaff(string $role): User
{
    return User::factory()->create(['is_active' => true])->assignRole($role);
}

function srIngredient(string $name, string $unit): Ingredient
{
    return Ingredient::create(['name' => $name, 'base_unit_id' => Unit::where('abbreviation', $unit)->value('id'), 'reorder_level' => 0, 'average_cost_cents' => 5]);
}

function srProduct(): Product
{
    $categoryId = DB::table('categories')->insertGetId(['name' => 'Coffee', 'slug' => 'coffee-'.uniqid(), 'sort_order' => 0, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
    $id = DB::table('products')->insertGetId([
        'category_id' => $categoryId, 'name' => 'Latte', 'slug' => 'latte-'.uniqid(), 'base_price_cents' => 12000,
        'is_taxable' => true, 'is_available' => true, 'is_active' => true, 'sort_order' => 0, 'created_at' => now(), 'updated_at' => now(),
    ]);

    return Product::findOrFail($id);
}

function srPaidOrder(Product $product, string $status, int $qty = 2): Order
{
    $orderId = DB::table('orders')->insertGetId([
        'uuid' => (string) str()->uuid(), 'order_number' => 'R-'.uniqid(), 'business_date' => now()->toDateString(),
        'channel' => 'pos', 'type' => 'dine_in', 'status' => $status, 'payment_status' => 'paid',
        'subtotal_cents' => 24000, 'discount_cents' => 0, 'tax_cents' => 0, 'tip_cents' => 0, 'total_cents' => 24000, 'paid_cents' => 24000,
        'requires_verification' => false, 'created_at' => now(), 'updated_at' => now(),
    ]);
    DB::table('order_items')->insert([
        'order_id' => $orderId, 'product_id' => $product->id, 'product_name' => $product->name, 'unit_price_cents' => 12000,
        'quantity' => $qty, 'modifiers_total_cents' => 0, 'discount_cents' => 0, 'tax_cents' => 0, 'line_total_cents' => 12000 * $qty,
        'status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
    ]);

    return Order::findOrFail($orderId);
}

/** 250 ml of milk per latte, 100 ml in stock... then a paid order of 2 lattes takes 500 ml. */
function srSetup(string $status): array
{
    $milk = srIngredient('Milk', 'ml');
    $product = srProduct();
    $recipe = Recipe::create(['product_id' => $product->id, 'yield_quantity' => 1]);
    $recipe->items()->create(['ingredient_id' => $milk->id, 'quantity' => 250, 'unit_id' => Unit::where('abbreviation', 'ml')->value('id')]);

    app(StockService::class)->record($milk, StockMovementType::Purchase, 5000);
    $order = srPaidOrder($product, $status);
    DeductStockForOrder::dispatchSync($order->id);

    return [$milk, $order];
}

const SR_ON_HAND = 'quantity';

it('puts the stock back when a paid order is voided before the kitchen started', function () {
    [$milk, $order] = srSetup('confirmed');
    expect((float) $milk->stockLevel()->value(SR_ON_HAND))->toBe(4500.0);

    app(OrderStatusService::class)->transition($order, OrderStatus::Voided, srStaff('manager'), 'Customer left');

    expect((float) $milk->stockLevel()->value(SR_ON_HAND))->toBe(5000.0);
});

it('keeps the stock deducted when the order was already completed (the food was made)', function () {
    [$milk, $order] = srSetup('completed');

    app(OrderStatusService::class)->transition($order, OrderStatus::Voided, srStaff('manager'), 'Customer unhappy');

    expect((float) $milk->stockLevel()->value(SR_ON_HAND))->toBe(4500.0);
});

it('returns stock once, even when asked twice', function () {
    [$milk, $order] = srSetup('completed');
    $returns = app(StockReturnService::class);

    expect($returns->returnForOrder($order))->toBe(1);
    expect($returns->returnForOrder($order))->toBe(0);
    expect((float) $milk->stockLevel()->value(SR_ON_HAND))->toBe(5000.0);
});

it('lets a manager return stock by hand for a refunded order, and a cashier not', function () {
    [$milk, $order] = srSetup('completed');
    app(OrderStatusService::class)->transition($order, OrderStatus::Voided, srStaff('manager'), 'Wrong order');

    $this->actingAs(srStaff('cashier'))->postJson("/api/v1/orders/{$order->id}/return-stock")->assertForbidden();

    $this->actingAs(srStaff('manager'))->postJson("/api/v1/orders/{$order->id}/return-stock")
        ->assertOk()->assertJsonPath('data.returned', 1);

    expect((float) $milk->stockLevel()->value(SR_ON_HAND))->toBe(5000.0);
});

it('refuses to return stock for an order that is neither voided nor refunded', function () {
    [, $order] = srSetup('completed');

    $this->actingAs(srStaff('manager'))->postJson("/api/v1/orders/{$order->id}/return-stock")->assertStatus(422);
});
