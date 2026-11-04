<?php

namespace App\Services\Kiosk;

use App\Enums\OrderChannel;
use App\Models\UpsellRule;
use Illuminate\Validation\ValidationException;

/** Validates an upsell rule on a cart line and returns the promo unit price when configured. */
class UpsellRulePricing
{
    /**
     * @return array{unit_price_cents: int, original_unit_price_cents: int, reason: string}|null null when the line uses the list price (no override row)
     */
    public function forLine(?int $ruleId, int $productId, int $listPriceCents, OrderChannel $channel, int $lineIndex): ?array
    {
        if ($ruleId === null) {
            return null;
        }

        $rule = UpsellRule::query()->whereKey($ruleId)->where('is_active', true)->first();

        if ($rule === null || (int) $rule->suggested_product_id !== $productId) {
            $this->fail($lineIndex, 'This upsell offer is no longer available.');
        }

        if (! $this->channelAllows($rule->channel, $channel)) {
            $this->fail($lineIndex, 'This upsell offer is not available here.');
        }

        if ($rule->upsell_price_cents === null) {
            return null;
        }

        $promo = (int) $rule->upsell_price_cents;

        if ($promo === $listPriceCents) {
            return null;
        }

        return [
            'unit_price_cents' => $promo,
            'original_unit_price_cents' => $listPriceCents,
            'reason' => 'Upsell offer',
        ];
    }

    private function channelAllows(string $ruleChannel, OrderChannel $orderChannel): bool
    {
        return match ($orderChannel) {
            OrderChannel::Kiosk => in_array($ruleChannel, ['all', 'kiosk'], true),
            OrderChannel::Pos => in_array($ruleChannel, ['all', 'pos'], true),
            default => $ruleChannel === 'all',
        };
    }

    private function fail(int $lineIndex, string $message): never
    {
        throw ValidationException::withMessages([
            "items.$lineIndex.upsell_rule_id" => [$message],
        ]);
    }
}
