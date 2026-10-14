<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Who may void or refund an order.
 *
 * A cashier can only void or refund an order they took themselves, so the money comes back out of
 * the drawer that took it in. Someone holding the override permission (manager, owner) can do it for
 * any order. Super-admin passes through Gate::before. A manager's PIN approval does NOT make another
 * cashier the owner of the order: approval answers "is it allowed?", this answers "is it theirs?".
 *
 * Orders with no creator (kiosk orders) can therefore only be voided or refunded by a manager.
 */
class OrderPolicy
{
    public function void(User $user, Order $order): Response
    {
        return $this->ownerOrOverride($user, $order, 'order.void', 'void');
    }

    public function refund(User $user, Order $order): Response
    {
        return $this->ownerOrOverride($user, $order, 'payment.refund', 'refund');
    }

    private function ownerOrOverride(User $user, Order $order, string $permission, string $verb): Response
    {
        if ($user->can($permission) || ($order->created_by !== null && $order->created_by === $user->id)) {
            return Response::allow();
        }

        return Response::deny("Only the cashier who took this order, or a manager, can {$verb} it.");
    }
}
