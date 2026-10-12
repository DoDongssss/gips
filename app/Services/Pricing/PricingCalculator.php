<?php

namespace App\Services\Pricing;

/**
 * Pure integer-centavo pricing. No database, no floats, so it can be unit tested to the centavo.
 *
 * Rules
 *  - Line gross = max(0, unit price + per-unit modifiers) x quantity. Prices already include
 *    tax when the tax is inclusive.
 *  - Discounts apply in this order: VAT-exempt ones first, then line (item) discounts, then
 *    order discounts. Each one works on what is left after the previous (stacking).
 *  - Percent: half-up rounding on the total, then split across lines (largest remainder),
 *    so the pieces always add up to the total exactly.
 *  - VAT-exempt discount (senior / PWD): when tax is inclusive the VAT is removed from the
 *    affected lines first, the percent comes off the VAT-free price, and no tax is charged on
 *    those lines. The reported discount amount includes the removed VAT.
 *    ** The Philippine rule must be confirmed with the store's accountant before launch. **
 *  - Tax is computed once on the whole order, then split across lines.
 */
final class PricingCalculator
{
    /**
     * @param  array<int, array{unit_cents:int, modifiers_cents:int, quantity:int, taxable:bool}>  $lines
     * @param  array<int, array{key:string, type:string, value:int, scope:string, line:?int, vat_exempt:bool}>  $discounts
     *                                                                                                                      type: percent|fixed, scope: order|item
     * @param  array{rate_bp:int, inclusive:bool}|null  $tax
     * @return array<string, mixed>
     */
    public function calculate(array $lines, array $discounts, ?array $tax): array
    {
        $n = count($lines);
        $gross = [];
        foreach ($lines as $i => $l) {
            $gross[$i] = max(0, $l['unit_cents'] + $l['modifiers_cents']) * $l['quantity'];
        }

        $run = $gross;
        $exempt = array_fill_keys(array_keys($lines), false);
        $lineDiscount = array_fill_keys(array_keys($lines), 0);
        $applied = [];

        foreach ($this->ordered($discounts) as $d) {
            $eligible = $d['scope'] === 'item'
                ? (isset($run[$d['line']]) ? [$d['line']] : [])
                : array_keys(array_filter($run, fn ($amount) => $amount > 0));

            $vatRemoved = [];
            if ($d['vat_exempt']) {
                foreach ($eligible as $i) {
                    $vatRemoved[$i] = 0;
                    if ($lines[$i]['taxable'] && $tax && $tax['inclusive'] && ! $exempt[$i]) {
                        $base = $this->divRound($run[$i] * 10000, 10000 + $tax['rate_bp']);
                        $vatRemoved[$i] = $run[$i] - $base;
                        $run[$i] = $base;
                    }
                    $exempt[$i] = true;
                }
            }

            $weights = [];
            foreach ($eligible as $i) {
                $weights[$i] = $run[$i];
            }
            $base = array_sum($weights);

            $amount = $d['type'] === 'percent'
                ? $this->divRound($base * $d['value'], 10000)
                : min($d['value'], $base);

            foreach ($this->allocate($amount, $weights) as $i => $share) {
                $run[$i] -= $share;
                $lineDiscount[$i] += $share;
            }
            foreach ($vatRemoved as $i => $removed) {
                $lineDiscount[$i] += $removed;
            }

            $applied[] = [
                'key' => $d['key'],
                'line' => $d['scope'] === 'item' ? $d['line'] : null,
                'amount_cents' => $amount + array_sum($vatRemoved),
                'vat_removed_cents' => array_sum($vatRemoved),
            ];
        }

        // ---- tax, once for the whole order ----
        $taxableLine = [];
        foreach ($lines as $i => $l) {
            $taxableLine[$i] = ($l['taxable'] && ! $exempt[$i] && $tax) ? $run[$i] : 0;
        }
        $sumTaxable = array_sum($taxableLine);
        $taxTotal = 0;
        $vatableSales = $sumTaxable;

        if ($tax && $sumTaxable > 0) {
            if ($tax['inclusive']) {
                $vatableSales = $this->divRound($sumTaxable * 10000, 10000 + $tax['rate_bp']);
                $taxTotal = $sumTaxable - $vatableSales;
            } else {
                $taxTotal = $this->divRound($sumTaxable * $tax['rate_bp'], 10000);
            }
        }
        $lineTax = $this->allocate($taxTotal, $taxableLine);

        $inclusive = $tax['inclusive'] ?? true;
        $resultLines = [];
        $exemptSales = 0;
        foreach ($lines as $i => $l) {
            $lineTotal = $run[$i] + ($inclusive ? 0 : ($lineTax[$i] ?? 0));
            if ($exempt[$i] && $l['taxable']) {
                $exemptSales += $run[$i];
            }
            $resultLines[$i] = [
                'unit_total_cents' => max(0, $l['unit_cents'] + $l['modifiers_cents']),
                'gross_cents' => $gross[$i],
                'discount_cents' => $lineDiscount[$i],
                'tax_cents' => $lineTax[$i] ?? 0,
                'line_total_cents' => $lineTotal,
                'vat_exempt' => $exempt[$i],
            ];
        }

        return [
            'lines' => $resultLines,
            'discounts' => $applied,
            'subtotal_cents' => array_sum($gross),
            'discount_cents' => array_sum($lineDiscount),
            'tax_cents' => $taxTotal,
            'total_cents' => array_sum(array_column($resultLines, 'line_total_cents')),
            'tax' => $tax ? [
                'rate_bp' => $tax['rate_bp'],
                'inclusive' => $tax['inclusive'],
                'taxable_cents' => $vatableSales,
                'tax_cents' => $taxTotal,
            ] : null,
            'vat_exempt_sales_cents' => $exemptSales,
        ];
    }

    /**
     * Split $total across $weights so the parts add up exactly (largest remainder method).
     *
     * @param  array<int, int>  $weights
     * @return array<int, int>
     */
    public function allocate(int $total, array $weights): array
    {
        $shares = array_fill_keys(array_keys($weights), 0);
        $sum = array_sum($weights);
        if ($total <= 0 || $sum <= 0) {
            return $shares;
        }

        $remainders = [];
        $given = 0;
        foreach ($weights as $key => $w) {
            $shares[$key] = intdiv($total * $w, $sum);
            $remainders[$key] = ($total * $w) % $sum;
            $given += $shares[$key];
        }

        $left = $total - $given;
        $keys = array_keys($remainders);
        usort($keys, fn ($a, $b) => [$remainders[$b], $a] <=> [$remainders[$a], $b]);
        foreach (array_slice($keys, 0, $left) as $key) {
            $shares[$key]++;
        }

        return $shares;
    }

    /** Half-up division for non-negative integers. */
    public function divRound(int $a, int $b): int
    {
        return intdiv(2 * $a + $b, 2 * $b);
    }

    /**
     * VAT-exempt first, then item, then order; request order inside each group.
     *
     * @param  array<int, array<string, mixed>>  $discounts
     * @return array<int, array<string, mixed>>
     */
    private function ordered(array $discounts): array
    {
        $indexed = array_values($discounts);
        $rank = fn (array $d) => $d['vat_exempt'] ? 0 : ($d['scope'] === 'item' ? 1 : 2);
        usort($indexed, fn ($a, $b) => $rank($a) <=> $rank($b));

        return $indexed;
    }
}
