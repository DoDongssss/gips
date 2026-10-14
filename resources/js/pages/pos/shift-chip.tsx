import { Link } from '@inertiajs/react';
import { Wallet } from 'lucide-react';

import { useCan } from '@/hooks/use-can';
import { useShiftGate } from '@/hooks/use-shift-gate';
import { index as shiftsIndex } from '@/routes/shifts';

const timeText = (value: string) => new Date(value).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });

/** Header pill showing whether the cashier's drawer shift is open. Links to the Shift page for people who can open one. */
export function ShiftChip() {
    const { shift } = useShiftGate();
    const { can } = useCan();

    if (!shift) {
        return null;
    }

    const tone = shift.open ? 'bg-green-50 text-green-700' : shift.required ? 'bg-amber-50 text-amber-800' : 'bg-gray-100 text-gray-600';
    const text = shift.open ? `Shift open${shift.opened_at ? ` · ${timeText(shift.opened_at)}` : ''}` : shift.required ? 'Open your shift' : 'No shift';

    const chip = (
        <span className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium tabular-nums ${tone}`}>
            <Wallet className="size-4" />
            {text}
        </span>
    );

    return can('shift.open') ? (
        <Link href={shiftsIndex.url()} title="Open the Shift page">
            {chip}
        </Link>
    ) : (
        chip
    );
}
