<?php

namespace App\Services\Orders;

use App\Enums\DiscountScope;
use App\Models\Discount;
use App\Models\Modifier;
use App\Models\Product;
use App\Models\Tax;
use App\Models\User;
use App\Services\Pricing\PricingCalculator;
use Illuminate\Validation\ValidationException;

/**
 * Prices a cart from the DATABASE. Anything price-like in the request is ignored:
 * the client only says which product, size, add-ons and discounts it wants.
 */
class OrderPricingService
{
    public function __construct(
        private PricingCalculator $calculator,
        private ApprovalService $approvals,
    ) {}

    /**
     * @param  array<string, mixed>  $input  validated cart (items, discounts, approval)
     * @param  bool  $enforceApproval  false for the live cart preview, true when saving the order
     * @return array<string, mixed>
     */
    public function price(array $input, ?User $user, bool $enforceApproval = true): array
    {
        $lines = $this->resolveLines($input['items']);
        $discounts = $this->resolveDiscounts($input['discounts'] ?? [], count($lines), $user, $input['approval'] ?? null, $enforceApproval);
        $tax = Tax::where('is_active', true)->where('is_default', true)->first();

        $calc = $this->calculator->calculate(
            array_map(fn ($l) => [
                'unit_cents' => $l['unit_price_cents'],
                'modifiers_cents' => $l['modifiers_total_cents'],
                'quantity' => $l['quantity'],
                'taxable' => $l['taxable'],
            ], $lines),
            array_map(fn ($d) => [
                'key' => (string) $d['key'],
                'type' => $d['discount']->type->value,
                'value' => $d['discount']->value,
                'scope' => $d['discount']->applies_to->value,
                'line' => $d['line'],
                'vat_exempt' => $d['discount']->is_vat_exempt,
            ], $discounts),
            $tax ? ['rate_bp' => $tax->rateBasisPoints(), 'inclusive' => $tax->is_inclusive] : null,
        );

        return [
            'lines' => $lines,
            'discounts' => $discounts,
            'tax' => $tax,
            'calc' => $calc,
            'summary' => $this->summary($lines, $discounts, $tax, $calc),
        ];
    }

    /** @return array<int, array<string, mixed>> */
    private function resolveLines(array $items): array
    {
        $products = Product::query()
            ->with([
                'variants' => fn ($q) => $q->where('is_active', true),
                'modifierGroups' => fn ($q) => $q->where('modifier_groups.is_active', true),
                'modifierGroups.modifiers',
            ])
            ->whereIn('id', collect($items)->pluck('product_id')->unique())
            ->whereHas('category', fn ($q) => $q->where('is_active', true))
            ->where('is_active', true)
            ->get()
            ->keyBy('id');

        $lines = [];
        foreach (array_values($items) as $i => $item) {
            /** @var Product|null $product */
            $product = $products->get($item['product_id']);

            if (! $product) {
                $this->fail("items.$i.product_id", 'This product is no longer on the menu.');
            }
            if (! $product->is_available) {
                $this->fail("items.$i.product_id", "{$product->name} is sold out.");
            }

            $variant = null;
            if ($product->variants->isNotEmpty()) {
                $variant = ! empty($item['variant_id'])
                    ? $product->variants->firstWhere('id', $item['variant_id'])
                    : ($product->variants->firstWhere('is_default', true) ?? $product->variants->first());
                if (! $variant) {
                    $this->fail("items.$i.variant_id", "Choose a valid size for {$product->name}.");
                }
            } elseif (! empty($item['variant_id'])) {
                $this->fail("items.$i.variant_id", "{$product->name} has no sizes.");
            }

            [$modifiers, $perUnit] = $this->resolveModifiers($product, $item['modifiers'] ?? [], $i);

            $lines[] = [
                'product' => $product,
                'variant' => $variant,
                'product_name' => $product->name,
                'variant_name' => $variant?->name,
                'unit_price_cents' => $variant ? $variant->price_cents : $product->base_price_cents,
                'modifiers_total_cents' => $perUnit,
                'quantity' => (int) $item['quantity'],
                'taxable' => (bool) $product->is_taxable,
                'notes' => $item['notes'] ?? null,
                'modifiers' => $modifiers,
            ];
        }

        return $lines;
    }

    /** @return array{0: array<int, array<string, mixed>>, 1: int} */
    private function resolveModifiers(Product $product, array $ids, int $lineIndex): array
    {
        $ids = array_values(array_unique(array_map('intval', $ids)));

        $catalog = [];
        foreach ($product->modifierGroups as $group) {
            foreach ($group->modifiers as $modifier) {
                $catalog[$modifier->id] = [$group, $modifier];
            }
        }

        $picked = [];
        $perGroup = [];
        foreach ($ids as $id) {
            if (! isset($catalog[$id])) {
                $this->fail("items.$lineIndex.modifiers", "An add-on is not available for {$product->name}.");
            }
            [$group, $modifier] = $catalog[$id];
            /** @var Modifier $modifier */
            if (! $modifier->is_available) {
                $this->fail("items.$lineIndex.modifiers", "{$modifier->name} is sold out.");
            }
            $perGroup[$group->id] = ($perGroup[$group->id] ?? 0) + 1;
            $picked[] = [
                'modifier_id' => $modifier->id,
                'group_name' => $group->name,
                'modifier_name' => $modifier->name,
                'price_delta_cents' => $modifier->price_delta_cents,
            ];
        }

        foreach ($product->modifierGroups as $group) {
            $count = $perGroup[$group->id] ?? 0;
            $min = $group->is_required ? max($group->min_select, 1) : $group->min_select;
            $max = $group->selection_type->value === 'single' ? 1 : $group->max_select;

            if ($count < $min) {
                $this->fail("items.$lineIndex.modifiers", "Choose at least {$min} option(s) for {$group->name}.");
            }
            if ($max !== null && $count > $max) {
                $this->fail("items.$lineIndex.modifiers", "Choose at most {$max} option(s) for {$group->name}.");
            }
        }

        return [$picked, array_sum(array_column($picked, 'price_delta_cents'))];
    }

    /** @return array<int, array<string, mixed>> */
    private function resolveDiscounts(array $requested, int $lineCount, ?User $user, ?array $approval, bool $enforceApproval): array
    {
        $ids = collect($requested)->pluck('discount_id')->unique();
        $models = Discount::usable()->whereIn('id', $ids)->get()->keyBy('id');

        $resolved = [];
        $seen = [];
        $exemptCount = 0;

        foreach (array_values($requested) as $i => $row) {
            /** @var Discount|null $discount */
            $discount = $models->get($row['discount_id']);
            if (! $discount) {
                $this->fail("discounts.$i.discount_id", 'That discount is not available.');
            }

            $line = $row['item_index'] ?? null;
            if ($discount->applies_to === DiscountScope::Item) {
                if ($line === null || $line < 0 || $line >= $lineCount) {
                    $this->fail("discounts.$i.item_index", "{$discount->name} must be applied to an item in the cart.");
                }
            } else {
                $line = null;
            }

            $dupKey = $discount->id.':'.($line ?? 'order');
            if (isset($seen[$dupKey])) {
                $this->fail("discounts.$i.discount_id", "{$discount->name} is applied twice.");
            }
            $seen[$dupKey] = true;

            if ($discount->is_vat_exempt && ++$exemptCount > 1) {
                $this->fail("discounts.$i.discount_id", 'Only one VAT-exempt discount (senior or PWD) can be used per order.');
            }

            if ($discount->requires_id && blank($row['id_number'] ?? null)) {
                $this->fail("discounts.$i.id_number", "{$discount->name} needs the customer's ID number.");
            }

            $approver = null;
            if ($discount->requires_approval && $enforceApproval) {
                $approver = $this->approvals->resolve($user, $approval, 'discount.manage');
            }

            $resolved[] = [
                'key' => $i,
                'discount' => $discount,
                'line' => $line,
                'id_number' => $row['id_number'] ?? null,
                'approved_by' => $approver?->id,
            ];
        }

        return $resolved;
    }

    /** The breakdown the cart shows (and the preview endpoint returns). @return array<string, mixed> */
    private function summary(array $lines, array $discounts, ?Tax $tax, array $calc): array
    {
        return [
            'lines' => collect($lines)->map(fn ($l, $i) => [
                'index' => $i,
                'product_id' => $l['product']->id,
                'product_name' => $l['product_name'],
                'variant_id' => $l['variant']?->id,
                'variant_name' => $l['variant_name'],
                'quantity' => $l['quantity'],
                'unit_price_cents' => $l['unit_price_cents'],
                'modifiers_total_cents' => $l['modifiers_total_cents'],
                'modifiers' => $l['modifiers'],
                'gross_cents' => $calc['lines'][$i]['gross_cents'],
                'discount_cents' => $calc['lines'][$i]['discount_cents'],
                'tax_cents' => $calc['lines'][$i]['tax_cents'],
                'line_total_cents' => $calc['lines'][$i]['line_total_cents'],
            ])->values()->all(),
            'discounts' => collect($calc['discounts'])->map(fn ($a) => [
                'discount_id' => $discounts[$a['key']]['discount']->id,
                'name' => $discounts[$a['key']]['discount']->name,
                'item_index' => $a['line'],
                'amount_cents' => $a['amount_cents'],
            ])->values()->all(),
            'taxes' => $tax && $calc['tax'] ? [[
                'name' => $tax->name,
                'rate' => (string) $tax->rate,
                'is_inclusive' => $tax->is_inclusive,
                'taxable_cents' => $calc['tax']['taxable_cents'],
                'tax_cents' => $calc['tax']['tax_cents'],
            ]] : [],
            'subtotal_cents' => $calc['subtotal_cents'],
            'discount_cents' => $calc['discount_cents'],
            'tax_cents' => $calc['tax_cents'],
            'total_cents' => $calc['total_cents'],
            'vat_exempt_sales_cents' => $calc['vat_exempt_sales_cents'],
        ];
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
