<?php

use App\Models\Order;
use App\Services\ConfigurationService;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Refund;
use App\Models\User;
use Illuminate\Support\Str;

// Whole-order money: cart -> pay (exact, change, split, partial) -> refund (partial, full, too much, approval) -> receipts.

use App\Models\Product;
use Database\Seeders\DiscountSeeder;
use Database\Seeders\PaymentMethodSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\TaxSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

// Self-contained: seeds roles, 12% inclusive VAT, payment methods and discounts itself (om* helpers below).

function omUser(string $role = 'cashier'): User
{
    if (Role::count() === 0) {
        test()->seed([PermissionSeeder::class, RoleSeeder::class, TaxSeeder::class, PaymentMethodSeeder::class, DiscountSeeder::class]);
    }

    // Money rules are tested here, not the shift rule: no open shift is needed for these payments and refunds.
    app(ConfigurationService::class)->update('shifts', ['shifts_require_open_shift' => false]);

    return User::factory()->create(['is_active' => true])->assignRole($role);
}

/** The code of the seeded cash payment method (whatever the seeder calls it), switched on. */
function omCash(): string
{
    $method = PaymentMethod::where('type', 'cash')->first();

    if (! $method) {
        throw new RuntimeException('No cash payment method was seeded. Check PaymentMethodSeeder.');
    }

    if (! $method->is_active) {
        $method->update(['is_active' => true]);
    }

    return $method->code;
}

function omManagerWithPin(string $pin): User
{
    $manager = omUser('manager');
    $manager->forceFill(['pin' => Hash::make($pin)])->save();

    return $manager;
}

// Your project has no ProductFactory, so the product is inserted directly (same columns as the other Phase 8 tests).
function omProduct(int $priceCents): Product
{
    $category = DB::table('categories')->first()?->id ?? DB::table('categories')->insertGetId(['name' => 'Coffee', 'slug' => 'coffee', 'sort_order' => 0, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);

    $id = DB::table('products')->insertGetId([
        'category_id' => $category, 'name' => 'Item '.uniqid(), 'slug' => 'item-'.uniqid(), 'base_price_cents' => $priceCents,
        'is_taxable' => true, 'is_available' => true, 'is_active' => true, 'sort_order' => 0, 'created_at' => now(), 'updated_at' => now(),
    ]);

    return Product::findOrFail($id);
}

function omItem(Product $product, int $quantity = 1): array
{
    return ['product_id' => $product->id, 'quantity' => $quantity];
}

function omCart(array $items): array
{
    return ['type' => 'takeout', 'items' => $items];
}

function omPlace(User $user, array $items): array
{
    return test()->actingAs($user)->postJson('/api/v1/orders', omCart($items), ['Idempotency-Key' => (string) Str::uuid()])->assertCreated()->json('data');
}

function omPay(User $user, int $orderId, array $payments, ?string $key = null)
{
    return test()->actingAs($user)->postJson("/api/v1/orders/{$orderId}/payments", ['payments' => $payments], ['Idempotency-Key' => $key ?? (string) Str::uuid()]);
}

/** A staff member who may refund on their own. */
function omRefunder(): User
{
    $user = omUser('manager');
    $user->givePermissionTo('payment.refund');

    return $user;
}

function omRefund(User $user, int $orderId, int $paymentId, int $amount, ?array $approval = null, ?string $key = null)
{
    return test()->actingAs($user)->postJson(
        "/api/v1/orders/{$orderId}/refunds",
        array_filter(['payment_id' => $paymentId, 'amount_cents' => $amount, 'reason' => 'Customer returned it', 'approval' => $approval]),
        ['Idempotency-Key' => $key ?? (string) Str::uuid()],
    );
}

/** An order of one 112.00 item, paid in cash. Returns [cashier, orderId, paymentId]. */
function omPaid(int $price = 11200, int $tendered = 11200): array
{
    $cashier = omUser();
    $order = omPlace($cashier, [omItem(omProduct($price))]);
    $paid = omPay($cashier, $order['id'], [['method' => omCash(), 'tendered_cents' => $tendered]])->assertCreated()->json('data');

    return [$cashier, $order['id'], $paid['payments'][0]['id'], $paid];
}

it('settles an exact cash payment and the receipt matches the order', function () {
    [, , , $paid] = omPaid();

    expect($paid['payment_status'])->toBe('paid')
        ->and($paid['paid_cents'])->toBe($paid['total_cents'])
        ->and($paid['balance_cents'])->toBe(0)
        ->and($paid['payments'][0]['change_cents'])->toBe(0);

    $sale = collect($paid['receipts'])->firstWhere('type', 'sale');
    expect($sale)->not->toBeNull()
        ->and($sale['content']['total_cents'])->toBe($paid['total_cents'])
        ->and($sale['content']['tax_cents'])->toBe($paid['tax_cents'])
        ->and(collect($sale['content']['payments'])->sum('amount_cents'))->toBe($paid['total_cents']);
});

it('keeps VAT inside the price: 112.00 is 100.00 plus 12.00 and the customer pays 112.00', function () {
    [, , , $paid] = omPaid(11200);

    expect($paid['total_cents'])->toBe(11200)->and($paid['tax_cents'])->toBe(1200);
});

it('gives change on a larger cash note and only the order total counts as sales', function () {
    [, , , $paid] = omPaid(11200, 20000);

    expect($paid['payments'][0]['amount_cents'])->toBe(11200)
        ->and($paid['payments'][0]['change_cents'])->toBe(8800)
        ->and($paid['paid_cents'])->toBe(11200);
});

it('adds up a split payment: two cash rows cover the order and the change is right', function () {
    $cashier = omUser();
    $order = omPlace($cashier, [omItem(omProduct(11200))]);

    $paid = omPay($cashier, $order['id'], [
        ['method' => omCash(), 'tendered_cents' => 5000],
        ['method' => omCash(), 'tendered_cents' => 10000],
    ])->assertCreated()->json('data');

    expect(collect($paid['payments'])->sum('amount_cents'))->toBe(11200)
        ->and(collect($paid['payments'])->sum('change_cents'))->toBe(3800)
        ->and($paid['payment_status'])->toBe('paid');
});

it('leaves the balance open after a part payment and finishes it with the rest', function () {
    $cashier = omUser();
    $order = omPlace($cashier, [omItem(omProduct(11200))]);

    $part = omPay($cashier, $order['id'], [['method' => omCash(), 'tendered_cents' => 5000]])->assertCreated()->json('data');
    expect($part['payment_status'])->toBe('partial')->and($part['balance_cents'])->toBe(6200)->and($part['receipts'])->toBeEmpty();

    $rest = omPay($cashier, $order['id'], [['method' => omCash(), 'tendered_cents' => 6200]])->assertCreated()->json('data');
    expect($rest['payment_status'])->toBe('paid')->and($rest['balance_cents'])->toBe(0)->and($rest['paid_cents'])->toBe(11200);
});

it('never charges twice when the same payment is sent again with the same key', function () {
    $cashier = omUser();
    $order = omPlace($cashier, [omItem(omProduct(11200))]);
    $key = (string) Str::uuid();

    omPay($cashier, $order['id'], [['method' => omCash(), 'tendered_cents' => 11200]], $key)->assertCreated();
    omPay($cashier, $order['id'], [['method' => omCash(), 'tendered_cents' => 11200]], $key)->assertHeader('Idempotent-Replayed', 'true');

    expect(Payment::where('order_id', $order['id'])->count())->toBe(1)->and(Order::find($order['id'])->paid_cents)->toBe(11200);
});

it('refuses a second payment on an order that is already paid', function () {
    [$cashier, $orderId] = omPaid();

    omPay($cashier, $orderId, [['method' => omCash(), 'tendered_cents' => 11200]])->assertUnprocessable();

    expect(Payment::where('order_id', $orderId)->count())->toBe(1);
});

it('makes the lines add up to the total for several items and quantities', function () {
    $cashier = omUser();
    $order = omPlace($cashier, [omItem(omProduct(9950), 3), omItem(omProduct(14500), 2), omItem(omProduct(7300))]);

    $lines = collect($order['items'])->sum('line_total_cents');
    expect($lines)->toBe($order['total_cents'])->and($order['total_cents'])->toBe(9950 * 3 + 14500 * 2 + 7300);

    $paid = omPay($cashier, $order['id'], [['method' => omCash(), 'tendered_cents' => 70000]])->assertCreated()->json('data');
    expect($paid['payments'][0]['amount_cents'])->toBe($order['total_cents'])
        ->and($paid['payments'][0]['change_cents'])->toBe(70000 - $order['total_cents']);
});

it('refunds part of a payment, keeps the sale paid and issues a refund receipt', function () {
    [, $orderId, $paymentId] = omPaid();

    $order = omRefund(omRefunder(), $orderId, $paymentId, 3000)->assertCreated()->json('data');

    expect($order['payment_status'])->toBe('paid')
        ->and(collect($order['refunds'])->sum('amount_cents'))->toBe(3000)
        ->and(collect($order['receipts'])->where('type', 'refund')->count())->toBe(1)
        ->and(collect($order['receipts'])->where('type', 'sale')->count())->toBe(1);
});

it('stops a refund bigger than what is left of the payment', function () {
    [, $orderId, $paymentId] = omPaid();
    $manager = omRefunder();

    omRefund($manager, $orderId, $paymentId, 3000)->assertCreated();
    omRefund($manager, $orderId, $paymentId, 9000)->assertUnprocessable()->assertJsonValidationErrors('amount_cents');

    expect((int) Refund::where('order_id', $orderId)->sum('amount_cents'))->toBe(3000);
});

it('marks the order refunded once the whole payment is given back, in one go or in steps', function () {
    [, $orderId, $paymentId] = omPaid();
    $manager = omRefunder();

    omRefund($manager, $orderId, $paymentId, 4000)->assertCreated();
    $order = omRefund($manager, $orderId, $paymentId, 7200)->assertCreated()->json('data');

    expect($order['payment_status'])->toBe('refunded')
        ->and(Payment::find($paymentId)->status->value)->toBe('refunded')
        ->and((int) Refund::where('order_id', $orderId)->sum('amount_cents'))->toBe(11200);

    omRefund($manager, $orderId, $paymentId, 100)->assertUnprocessable();
});

it('never refunds the same request twice when it is sent again with the same key', function () {
    [, $orderId, $paymentId] = omPaid();
    $manager = omRefunder();
    $key = (string) Str::uuid();

    omRefund($manager, $orderId, $paymentId, 3000, null, $key)->assertCreated();
    omRefund($manager, $orderId, $paymentId, 3000, null, $key)->assertHeader('Idempotent-Replayed', 'true');

    expect(Refund::where('order_id', $orderId)->count())->toBe(1);
});

it('lets a cashier refund only with a manager PIN, and records who approved', function () {
    [$cashier, $orderId, $paymentId] = omPaid();
    expect($cashier->can('payment.refund'))->toBeFalse();

    omRefund($cashier, $orderId, $paymentId, 2000)->assertUnprocessable()->assertJsonValidationErrors('approval');
    expect(Refund::where('order_id', $orderId)->count())->toBe(0);

    $manager = omManagerWithPin('4321');
    $manager->givePermissionTo('payment.refund');

    omRefund($cashier, $orderId, $paymentId, 2000, ['user_id' => $manager->id, 'pin' => '4321'])->assertCreated();

    $refund = Refund::where('order_id', $orderId)->first();
    expect($refund->refunded_by)->toBe($cashier->id)->and($refund->approved_by)->toBe($manager->id);
});

it('refuses a refund with a wrong manager PIN', function () {
    [$cashier, $orderId, $paymentId] = omPaid();
    $manager = omManagerWithPin('4321');
    $manager->givePermissionTo('payment.refund');

    omRefund($cashier, $orderId, $paymentId, 2000, ['user_id' => $manager->id, 'pin' => '0000'])->assertUnprocessable();

    expect(Refund::where('order_id', $orderId)->count())->toBe(0);
});

it('does not refund a payment that belongs to another order', function () {
    [, $orderId] = omPaid();
    [, , $otherPayment] = omPaid();

    omRefund(omRefunder(), $orderId, $otherPayment, 1000)->assertNotFound();
});

it('needs a reason for a refund', function () {
    [, $orderId, $paymentId] = omPaid();

    omRefunder();
    test()->actingAs(omRefunder())->postJson("/api/v1/orders/{$orderId}/refunds", ['payment_id' => $paymentId, 'amount_cents' => 1000], ['Idempotency-Key' => (string) Str::uuid()])
        ->assertUnprocessable()->assertJsonValidationErrors('reason');
});