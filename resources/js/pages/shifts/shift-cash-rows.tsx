import { formatPeso } from '@/lib/money';
import type { ShiftRecord } from '@/types/shifts';

export function ShiftCashRows({ shift }: { shift: ShiftRecord }) {
    if (shift.cash) {
        return (
            <>
                <Row label="Opening cash" value={formatPeso(shift.opening_cash_cents)} />
                <Row label="Cash sales" value={formatPeso(shift.cash.cash_sales_cents)} />
                {shift.cash.cash_tips_cents > 0 && <Row label="Cash tips" value={formatPeso(shift.cash.cash_tips_cents)} />}
                <Row label="Cash in" value={formatPeso(shift.cash.cash_in_cents)} />
                <Row label="Cash out" value={`−${formatPeso(shift.cash.cash_out_cents)}`} />
                {shift.cash.cash_refunds_cents > 0 && <Row label="Cash refunds" value={`−${formatPeso(shift.cash.cash_refunds_cents)}`} />}
                <Row label="Expected in drawer" value={formatPeso(shift.cash.expected_cents)} strong />
            </>
        );
    }

    return (
        <p className="text-muted-foreground bg-muted/50 rounded-md p-3 text-sm">
            The expected total stays hidden until you close, so the count is honest. Count the drawer when your shift ends.
        </p>
    );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className={`flex justify-between text-sm ${strong ? 'border-t pt-2 font-semibold' : ''}`}>
            <span className={strong ? '' : 'text-muted-foreground'}>{label}</span>
            <span>{value}</span>
        </div>
    );
}
