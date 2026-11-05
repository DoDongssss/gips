<?php

namespace App\Services\Customers;

use App\Enums\LoyaltyTransactionType;
use App\Models\Customer;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\User;
use App\Services\Configuration\ConfigurationService;
use App\Support\Audit;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LoyaltyService
{
    public function __construct(private ConfigurationService $configuration) {}

    public function isEnabled(): bool
    {
        return (bool) $this->configuration->get('loyalty_enabled');
    }

    public function centsPerPointEarned(): int
    {
        $value = (int) $this->configuration->get('loyalty_cents_per_point');

        return max(1, $value);
    }

    public function centavosPerPointRedeem(): int
    {
        $value = (int) $this->configuration->get('loyalty_redeem_centavos_per_point');

        return max(1, $value);
    }

    /**
     * @return array{points:int, redeem_cents:int}
     */
    public function resolveRedemption(?Customer $customer, int $requestedPoints, int $orderTotalCents): array
    {
        if ($requestedPoints <= 0 || ! $this->isEnabled() || ! $customer) {
            return ['points' => 0, 'redeem_cents' => 0];
        }

        $rate = $this->centavosPerPointRedeem();
        $maxByTotal = intdiv(max(0, $orderTotalCents), $rate);
        $points = min($requestedPoints, $customer->loyalty_points, $maxByTotal);

        return [
            'points' => $points,
            'redeem_cents' => $points * $rate,
        ];
    }

    /**
     * @return array{calc: array<string, mixed>, summary: array<string, mixed>}
     */
    public function applyRedemptionToSummary(array $calc, array $summary, int $points, int $redeemCents): array
    {
        if ($points <= 0 || $redeemCents <= 0) {
            $summary['loyalty_redeem'] = ['points' => 0, 'amount_cents' => 0];

            return ['calc' => $calc, 'summary' => $summary];
        }

        $calc['total_cents'] = max(0, $calc['total_cents'] - $redeemCents);
        $calc['discount_cents'] += $redeemCents;

        $summary['subtotal_cents'] = $calc['subtotal_cents'];
        $summary['discount_cents'] = $calc['discount_cents'];
        $summary['tax_cents'] = $calc['tax_cents'];
        $summary['total_cents'] = $calc['total_cents'];
        $summary['loyalty_redeem'] = [
            'points' => $points,
            'amount_cents' => $redeemCents,
        ];

        return ['calc' => $calc, 'summary' => $summary];
    }

    public function validateRedemptionRequest(?Customer $customer, int $requestedPoints): void
    {
        if ($requestedPoints <= 0) {
            return;
        }

        if (! $this->isEnabled()) {
            throw ValidationException::withMessages(['loyalty_points_redeem' => 'Loyalty points are turned off in settings.']);
        }

        if (! $customer) {
            throw ValidationException::withMessages(['loyalty_points_redeem' => 'Link a customer before redeeming points.']);
        }

        if ($requestedPoints > $customer->loyalty_points) {
            throw ValidationException::withMessages(['loyalty_points_redeem' => 'The customer does not have enough points.']);
        }
    }

    public function processPaidOrder(Order $order): void
    {
        if (! $this->isEnabled()) {
            return;
        }

        DB::transaction(function () use ($order) {
            $locked = Order::query()->lockForUpdate()->find($order->id);

            if (! $locked || ! $locked->customer_id) {
                return;
            }

            $customer = Customer::query()->lockForUpdate()->find($locked->customer_id);

            if (! $customer) {
                return;
            }

            if ($locked->loyalty_points_redeemed > 0 && ! $locked->loyalty_redeemed) {
                $this->deductPoints(
                    $customer,
                    $locked->loyalty_points_redeemed,
                    LoyaltyTransactionType::Redeemed,
                    $locked,
                    null,
                    "Redeemed on {$locked->order_number}",
                );
                $locked->update(['loyalty_redeemed' => true]);
            }

            $this->awardForOrder($locked->fresh(['customer']));
        });
    }

    public function awardForOrder(Order $order): void
    {
        if (! $this->isEnabled() || ! $order->customer_id || $order->loyalty_points_awarded) {
            return;
        }

        $points = intdiv(max(0, $order->total_cents), $this->centsPerPointEarned());

        if ($points <= 0) {
            return;
        }

        DB::transaction(function () use ($order, $points) {
            $locked = Order::query()->lockForUpdate()->find($order->id);

            if (! $locked || $locked->loyalty_points_awarded || ! $locked->customer_id) {
                return;
            }

            $customer = Customer::query()->lockForUpdate()->find($locked->customer_id);

            if (! $customer) {
                return;
            }

            $this->addPoints(
                $customer,
                $points,
                LoyaltyTransactionType::Earned,
                $locked,
                null,
                "Earned on {$locked->order_number}",
            );

            $locked->update(['loyalty_points_awarded' => true]);

            Audit::record('customers', 'loyalty.awarded', "Awarded {$points} point(s) for {$locked->order_number}", $locked, [
                'customer_id' => $locked->customer_id,
                'points' => $points,
                'total_cents' => $locked->total_cents,
            ]);
        });
    }

    public function reverseForVoidedOrder(Order $order, ?User $user = null): void
    {
        if (! $order->customer_id) {
            return;
        }

        DB::transaction(function () use ($order, $user) {
            $locked = Order::query()->lockForUpdate()->find($order->id);

            if (! $locked || ! $locked->customer_id) {
                return;
            }

            $customer = Customer::query()->lockForUpdate()->find($locked->customer_id);

            if (! $customer) {
                return;
            }

            if ($locked->loyalty_redeemed && $locked->loyalty_points_redeemed > 0) {
                $this->addPoints(
                    $customer,
                    $locked->loyalty_points_redeemed,
                    LoyaltyTransactionType::Reversed,
                    $locked,
                    $user,
                    "Restored redemption for voided {$locked->order_number}",
                );
                $locked->update(['loyalty_redeemed' => false]);
            }

            if ($locked->loyalty_points_awarded) {
                $earned = intdiv(max(0, $locked->total_cents), $this->centsPerPointEarned());

                if ($earned > 0) {
                    $this->deductPoints(
                        $customer,
                        min($earned, $customer->loyalty_points),
                        LoyaltyTransactionType::Reversed,
                        $locked,
                        $user,
                        "Reversed earn for voided {$locked->order_number}",
                    );
                }

                $locked->update(['loyalty_points_awarded' => false]);
            }
        });
    }

    public function adjustBalance(Customer $customer, int $delta, User $actor, string $note): Customer
    {
        return DB::transaction(function () use ($customer, $delta, $actor, $note) {
            $locked = Customer::query()->lockForUpdate()->findOrFail($customer->id);

            if ($delta < 0 && $locked->loyalty_points + $delta < 0) {
                throw ValidationException::withMessages(['points' => 'That adjustment would make the balance negative.']);
            }

            if ($delta === 0) {
                return $locked;
            }

            $locked->increment('loyalty_points', $delta);

            LoyaltyTransaction::query()->create([
                'customer_id' => $locked->id,
                'user_id' => $actor->id,
                'type' => LoyaltyTransactionType::Adjusted,
                'points' => $delta,
                'balance_after' => $locked->fresh()->loyalty_points,
                'note' => $note,
            ]);

            Audit::record('customers', 'loyalty.adjusted', "Adjusted loyalty by {$delta} point(s)", $locked, [
                'delta' => $delta,
                'note' => $note,
                'user_id' => $actor->id,
            ]);

            return $locked->fresh();
        });
    }

    private function addPoints(
        Customer $customer,
        int $points,
        LoyaltyTransactionType $type,
        ?Order $order,
        ?User $user,
        ?string $note,
    ): void {
        $customer->increment('loyalty_points', $points);

        LoyaltyTransaction::query()->create([
            'customer_id' => $customer->id,
            'order_id' => $order?->id,
            'user_id' => $user?->id,
            'type' => $type,
            'points' => $points,
            'balance_after' => $customer->fresh()->loyalty_points,
            'note' => $note,
        ]);
    }

    private function deductPoints(
        Customer $customer,
        int $points,
        LoyaltyTransactionType $type,
        ?Order $order,
        ?User $user,
        ?string $note,
    ): void {
        $points = min($points, $customer->loyalty_points);

        if ($points <= 0) {
            return;
        }

        $customer->decrement('loyalty_points', $points);

        LoyaltyTransaction::query()->create([
            'customer_id' => $customer->id,
            'order_id' => $order?->id,
            'user_id' => $user?->id,
            'type' => $type,
            'points' => -$points,
            'balance_after' => $customer->fresh()->loyalty_points,
            'note' => $note,
        ]);
    }
}
