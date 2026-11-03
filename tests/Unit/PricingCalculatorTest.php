<?php

use App\Services\Pricing\PricingCalculator;

/*
 | Money-path tests: every expected number below was worked out by hand in centavos, not copied from
 | the code's output. VAT is 12% (1200 basis points). Half-up rounding at the centavo.
 |
 | Hand working for the key case, P100.00 inclusive:  10000 / 1.12 = 8928.57 -> 8929 vatable, VAT = 10000 - 8929 = 1071.
 */

function pcCalc(array $lines, array $discounts = [], ?array $tax = null): array
{
    return (new PricingCalculator)->calculate($lines, $discounts, $tax);
}

function pcLine(int $unit, int $modifiers = 0, int $qty = 1, bool $taxable = true): array
{
    return ['unit_cents' => $unit, 'modifiers_cents' => $modifiers, 'quantity' => $qty, 'taxable' => $taxable];
}

function pcDiscount(string $type, int $value, string $scope = 'order', ?int $line = null, bool $vatExempt = false, string $key = 'd'): array
{
    return ['key' => $key, 'type' => $type, 'value' => $value, 'scope' => $scope, 'line' => $line, 'vat_exempt' => $vatExempt];
}

const PC_VAT_INCLUSIVE = ['rate_bp' => 1200, 'inclusive' => true];
const PC_VAT_EXCLUSIVE = ['rate_bp' => 1200, 'inclusive' => false];

it('keeps the total at the menu price when VAT is inclusive, and reports the VAT inside it', function () {
    $r = pcCalc([pcLine(11200)], [], PC_VAT_INCLUSIVE);

    expect($r['total_cents'])->toBe(11200)
        ->and($r['tax_cents'])->toBe(1200)
        ->and($r['tax']['taxable_cents'])->toBe(10000);
});

it('rounds inclusive VAT half-up at the centavo (P100.00 -> VAT P10.71)', function () {
    $r = pcCalc([pcLine(10000)], [], PC_VAT_INCLUSIVE);

    expect($r['total_cents'])->toBe(10000)
        ->and($r['tax']['taxable_cents'])->toBe(8929)
        ->and($r['tax_cents'])->toBe(1071);
});

it('adds VAT on top when it is exclusive (P100.00 -> P112.00)', function () {
    $r = pcCalc([pcLine(10000)], [], PC_VAT_EXCLUSIVE);

    expect($r['subtotal_cents'])->toBe(10000)
        ->and($r['tax_cents'])->toBe(1200)
        ->and($r['total_cents'])->toBe(11200);
});

it('multiplies unit price plus add-ons by the quantity', function () {
    // (150.00 + 25.00) x 3 = 525.00; 525.00 / 1.12 = 468.75 exactly, so VAT is 56.25
    $r = pcCalc([pcLine(15000, 2500, 3)], [], PC_VAT_INCLUSIVE);

    expect($r['subtotal_cents'])->toBe(52500)
        ->and($r['total_cents'])->toBe(52500)
        ->and($r['tax_cents'])->toBe(5625);
});

it('charges no VAT on a non-taxable item', function () {
    $r = pcCalc([pcLine(8000, taxable: false), pcLine(11200)], [], PC_VAT_INCLUSIVE);

    expect($r['total_cents'])->toBe(19200)
        ->and($r['tax_cents'])->toBe(1200)
        ->and($r['tax']['taxable_cents'])->toBe(10000);
});

it('works out VAT after a percent discount, not before', function () {
    // 200.00 less 10% = 180.00; 180.00 / 1.12 = 160.71 vatable, VAT 19.29
    $r = pcCalc([pcLine(20000)], [pcDiscount('percent', 1000)], PC_VAT_INCLUSIVE);

    expect($r['discount_cents'])->toBe(2000)
        ->and($r['total_cents'])->toBe(18000)
        ->and($r['tax_cents'])->toBe(1929);
});

it('takes a fixed discount off and re-works the VAT', function () {
    // 200.00 less 50.00 = 150.00; 150.00 / 1.12 = 133.93 vatable, VAT 16.07
    $r = pcCalc([pcLine(20000)], [pcDiscount('fixed', 5000)], PC_VAT_INCLUSIVE);

    expect($r['discount_cents'])->toBe(5000)
        ->and($r['total_cents'])->toBe(15000)
        ->and($r['tax_cents'])->toBe(1607);
});

it('never discounts below zero', function () {
    $r = pcCalc([pcLine(20000)], [pcDiscount('fixed', 30000)], PC_VAT_INCLUSIVE);

    expect($r['discount_cents'])->toBe(20000)
        ->and($r['total_cents'])->toBe(0)
        ->and($r['tax_cents'])->toBe(0);
});

it('stacks an item discount first and an order discount on what is left', function () {
    // lines 100.00 and 200.00. Item: 10% of line 1 = 10.00 -> 90.00.
    // Order: 5% of (90.00 + 200.00) = 14.50, split 4.50 / 10.00 -> 85.50 and 190.00. Total 275.50.
    $r = pcCalc(
        [pcLine(10000), pcLine(20000)],
        [pcDiscount('percent', 500, 'order', key: 'order'), pcDiscount('percent', 1000, 'item', 0, key: 'item')],
        PC_VAT_INCLUSIVE,
    );

    expect($r['subtotal_cents'])->toBe(30000)
        ->and($r['discount_cents'])->toBe(2450)
        ->and($r['total_cents'])->toBe(27550)
        ->and($r['lines'][0]['discount_cents'])->toBe(1450)
        ->and($r['lines'][1]['discount_cents'])->toBe(1000)
        ->and($r['tax_cents'])->toBe(2952);
});

it('applies exclusive VAT after the discount', function () {
    // 200.00 less 10% = 180.00; VAT 12% = 21.60; total 201.60
    $r = pcCalc([pcLine(20000)], [pcDiscount('percent', 1000)], PC_VAT_EXCLUSIVE);

    expect($r['tax_cents'])->toBe(2160)
        ->and($r['total_cents'])->toBe(20160);
});

it('splits VAT across lines so the pieces add up exactly', function () {
    $r = pcCalc([pcLine(3333), pcLine(3333), pcLine(3333)], [], PC_VAT_INCLUSIVE);

    expect($r['tax_cents'])->toBe(1071)
        ->and(array_sum(array_column($r['lines'], 'tax_cents')))->toBe(1071);
});

it('has no VAT at all when no tax is set up', function () {
    $r = pcCalc([pcLine(11200)], [], null);

    expect($r['total_cents'])->toBe(11200)
        ->and($r['tax_cents'])->toBe(0)
        ->and($r['tax'])->toBeNull();
});

it('prices an empty cart at zero', function () {
    $r = pcCalc([], [], PC_VAT_INCLUSIVE);

    expect($r['total_cents'])->toBe(0)->and($r['tax_cents'])->toBe(0);
});

// ---------------------------------------------------------------------------------------------
// Senior / PWD. The method below (take the VAT out first, then 20% off the VAT-free price, no VAT
// charged) is what the code does today. CONFIRM WITH THE STORE'S ACCOUNTANT BEFORE LAUNCH: if the
// accountant says otherwise, change the code and these numbers together.
// ---------------------------------------------------------------------------------------------
it('removes VAT and then takes 20% off for a VAT-exempt (senior / PWD) discount [confirm with accountant]', function () {
    // 112.00 -> VAT-free 100.00 -> less 20% (20.00) = 80.00. Reported discount = 20.00 + 12.00 VAT = 32.00.
    $r = pcCalc([pcLine(11200)], [pcDiscount('percent', 2000, 'order', null, true, 'senior')], PC_VAT_INCLUSIVE);

    expect($r['total_cents'])->toBe(8000)
        ->and($r['tax_cents'])->toBe(0)
        ->and($r['discount_cents'])->toBe(3200)
        ->and($r['discounts'][0]['amount_cents'])->toBe(3200)
        ->and($r['vat_exempt_sales_cents'])->toBe(8000);
});

// ---------------------------------------------------------------------------------------------
// Rules that must hold for ANY cart: 5,000 random carts from a fixed seed (same carts every run).
// ---------------------------------------------------------------------------------------------
it('keeps every money rule true across thousands of random carts', function () {
    mt_srand(20261021);
    $calculator = new PricingCalculator;
    $taxes = [null, PC_VAT_INCLUSIVE, PC_VAT_EXCLUSIVE];

    for ($n = 0; $n < 5000; $n++) {
        $lines = [];
        $count = mt_rand(1, 5);
        for ($i = 0; $i < $count; $i++) {
            $lines[] = pcLine(mt_rand(0, 30000), mt_rand(0, 3000), mt_rand(1, 6), mt_rand(0, 4) > 0);
        }

        $discounts = [];
        for ($j = 0, $m = mt_rand(0, 3); $j < $m; $j++) {
            $isItem = mt_rand(0, 1) === 1;
            $percent = mt_rand(0, 1) === 1;
            $discounts[] = pcDiscount($percent ? 'percent' : 'fixed', $percent ? mt_rand(1, 10000) : mt_rand(1, 40000), $isItem ? 'item' : 'order', $isItem ? mt_rand(0, $count - 1) : null, mt_rand(0, 5) === 0, "d$j");
        }

        $tax = $taxes[mt_rand(0, 2)];
        $r = $calculator->calculate($lines, $discounts, $tax);
        $inclusive = $tax === null || $tax['inclusive'];
        $expected = $r['subtotal_cents'] - $r['discount_cents'] + ($inclusive ? 0 : $r['tax_cents']);

        expect(array_sum(array_column($r['lines'], 'line_total_cents')))->toBe($r['total_cents'])
            ->and(array_sum(array_column($r['lines'], 'tax_cents')))->toBe($r['tax_cents'])
            ->and($r['total_cents'])->toBeGreaterThanOrEqual(0)
            ->and($r['discount_cents'])->toBeLessThanOrEqual($r['subtotal_cents'])
            ->and($r['total_cents'])->toBe($expected);
    }
});