<?php

namespace App\Services\Orders;

use App\Enums\ApprovalAction;
use App\Models\DiscountApproval;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * Who approved a sensitive action (senior/PWD discount, void)?
 *  - If the person acting already holds the permission, they approve themselves.
 *  - Otherwise a manager's user id + PIN must come with the request.
 * record() then writes the approval to discount_approvals, self-approvals included.
 */
class ApprovalService
{
    /** @param  array{user_id?:int|string, pin?:string}|null  $approval */
    public function resolve(?User $requester, ?array $approval, string $permission): User
    {
        if ($requester && $requester->can($permission)) {
            return $requester;
        }

        if (empty($approval['user_id']) || empty($approval['pin'])) {
            throw ValidationException::withMessages(['approval' => 'Manager approval is required for this action.']);
        }

        $throttle = 'approval:'.($requester?->id ?? 'guest').'|'.request()->ip();
        if (RateLimiter::tooManyAttempts($throttle, 5)) {
            throw ValidationException::withMessages([
                'approval' => 'Too many attempts. Try again in '.RateLimiter::availableIn($throttle).' seconds.',
            ]);
        }

        $approver = User::find($approval['user_id']);
        $valid = $approver
            && $approver->is_active
            && filled($approver->pin)
            && Hash::check((string) $approval['pin'], $approver->pin)
            && $approver->can($permission);

        if (! $valid) {
            RateLimiter::hit($throttle, 300);
            throw ValidationException::withMessages(['approval' => 'Invalid approval PIN.']);
        }

        RateLimiter::clear($throttle);

        return $approver;
    }

    /** Keep a permanent record of who approved what, for the order, payment or refund it was about. */
    public function record(User $requester, User $approver, ApprovalAction $action, Model $approvable, ?string $reason = null): DiscountApproval
    {
        return DiscountApproval::create([
            'approvable_type' => $approvable->getMorphClass(),
            'approvable_id' => $approvable->getKey(),
            'action' => $action,
            'requested_by' => $requester->id,
            'approved_by' => $approver->id,
            'reason' => $reason,
            'approved_at' => now(),
        ]);
    }
}
