import { formatPeso } from '@/lib/money';
import type { PaymentBreakdownRow } from '@/lib/reports';

type Props = {
    payments: PaymentBreakdownRow[];
    nonCashNetCents: number;
    compact?: boolean;
};

/** Sales by method for this shift. Non-cash totals are for reconciliation only — not counted in the drawer. */
export function ShiftPaymentsSummary({ payments, nonCashNetCents, compact }: Props) {
    if (payments.length === 0) {
        return compact ? null : <p className="text-muted-foreground text-sm">No payments recorded on this shift yet.</p>;
    }

    const nonCashRows = payments.filter((row) => row.type !== 'cash' && row.net_cents !== 0);
    const cashRow = payments.find((row) => row.type === 'cash');

    return (
        <div className="space-y-2 text-sm">
            {!compact && <p className="text-muted-foreground">Payment methods this shift (for your records).</p>}

            {cashRow && cashRow.net_cents > 0 && (
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash sales (in drawer)</span>
                    <span className="tabular-nums font-medium">{formatPeso(cashRow.net_cents)}</span>
                </div>
            )}

            {nonCashRows.length > 0 && (
                <ul className="space-y-1">
                    {nonCashRows.map((row) => (
                        <li key={row.code} className="flex justify-between gap-3">
                            <span className="text-muted-foreground">
                                {row.name}
                                <span className="hidden sm:inline"> · not in drawer</span>
                            </span>
                            <span className="tabular-nums">{formatPeso(row.net_cents)}</span>
                        </li>
                    ))}
                </ul>
            )}

            {nonCashNetCents > 0 && (
                <p className="text-muted-foreground border-t pt-2 text-xs leading-relaxed">
                    GCash, Maya, card, and bank transfer go to your merchant account — they are <strong className="font-medium text-foreground">not</strong> part of the
                    cash count. When you close, count only bills and coins; expected cash uses cash sales and movements only.
                </p>
            )}
        </div>
    );
}
