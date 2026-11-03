import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Approval } from '@/lib/pos-api';
import type { Approver } from '@/pages/orders/types';

type Props = {
    approvers: Approver[];
    value: Approval | null;
    onChange: (value: Approval | null) => void;
    error?: string;
    idPrefix?: string;
};

/** A manager picks their name and types their PIN. Shown only when the person acting cannot approve alone. */
export function ApprovalFields({ approvers, value, onChange, error, idPrefix = 'approval' }: Props) {
    const userId = value?.user_id ? String(value.user_id) : '';
    const pin = value?.pin ?? '';

    function update(next: { userId?: string; pin?: string }) {
        const id = next.userId ?? userId;
        const nextPin = next.pin ?? pin;

        onChange(id || nextPin ? { user_id: Number(id) || 0, pin: nextPin } : null);
    }

    if (approvers.length === 0) {
        return (
            <p className="text-destructive text-sm">
                This needs a manager&apos;s approval, but no manager has a PIN set. Ask the owner to set one.
            </p>
        );
    }

    return (
        <div className="space-y-3 rounded-md border p-3">
            <div>
                <p className="text-sm font-medium">Manager approval</p>
                <p className="text-muted-foreground text-xs">A manager chooses their name and enters their PIN.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label htmlFor={`${idPrefix}-user`}>Manager</Label>
                    <Select value={userId} onValueChange={(next) => update({ userId: next })}>
                        <SelectTrigger id={`${idPrefix}-user`}>
                            <SelectValue placeholder="Choose manager" />
                        </SelectTrigger>
                        <SelectContent>
                            {approvers.map((approver) => (
                                <SelectItem key={approver.id} value={String(approver.id)}>
                                    {approver.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor={`${idPrefix}-pin`}>PIN</Label>
                    <Input
                        id={`${idPrefix}-pin`}
                        type="password"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={20}
                        value={pin}
                        onChange={(event) => update({ pin: event.target.value })}
                    />
                </div>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
    );
}

/** True once a manager and a PIN have both been entered. */
export function isApprovalComplete(value: Approval | null): value is Approval {
    return value !== null && value.user_id > 0 && value.pin.length > 0;
}
