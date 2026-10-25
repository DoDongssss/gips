import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPeso } from '@/lib/money';

export type ReviewLine = {
    key: string;
    name: string;
    variant?: string | null;
    modifiers: string[];
    notes?: string | null;
    quantity: number;
    /** Price of one, with add-ons. Null while it is still being worked out. */
    unitCents?: number | null;
    /** What the customer pays for this line. Null while it is still being worked out; left out when the price is not known (saved orders). */
    totalCents?: number | null;
    /** Set when the price was changed from the list price. */
    changedFrom?: number | null;
};

type Props = {
    title: string;
    typeLabel: string;
    customer?: string | null;
    notes?: string | null;
    lines: ReviewLine[];
    loading?: boolean;
    problem?: string | null;
    /** The breakdown under the lines. Each row is label + value; the last one is the total. */
    summary: { label: string; value: string; tone?: 'discount' }[];
    totalLabel: string;
    totalCents: number;
    canContinue: boolean;
    onBack: () => void;
    onContinue: () => void;
    onSaveLater?: () => void;
    saving?: boolean;
    canPay: boolean;
};

/** Step 1 of checkout: the cashier reads the order back to the customer, then goes on to payment. */
export function OrderReview({ title, typeLabel, customer, notes, lines, loading, problem, summary, totalLabel, totalCents, canContinue, onBack, onContinue, onSaveLater, saving, canPay }: Props) {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);

    return (
        <div className="space-y-3">
            <DialogHeader className="gap-1 rounded-lg bg-gray-50 p-4">
                <DialogTitle className="text-lg">{title}</DialogTitle>
                <DialogDescription className="text-sm">
                    Check the order with the customer before taking payment.
                </DialogDescription>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 font-medium text-blue-700">{typeLabel}</span>
                    <span className="rounded-md bg-gray-200 px-2 py-0.5 font-medium text-gray-700 tabular-nums">
                        {count} {count === 1 ? 'item' : 'items'}
                    </span>
                    {customer && <span className="text-gray-600">for {customer}</span>}
                </div>
            </DialogHeader>

            <div className="max-h-[42vh] divide-y overflow-y-auto rounded-lg border" aria-label="Order items">
                {loading && <p className="text-muted-foreground p-6 text-center text-base">Loading the order…</p>}

                {!loading && lines.length === 0 && <p className="text-muted-foreground p-6 text-center text-base">{problem ?? 'No items to show.'}</p>}

                {lines.map((line) => (
                    <div key={line.key} className="flex items-start gap-3 p-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-base font-bold text-white tabular-nums">{line.quantity}</span>

                        <div className="min-w-0 flex-1">
                            <p className="text-base leading-snug font-semibold text-gray-900 [overflow-wrap:anywhere]">
                                {line.name}
                                {line.variant && <span className="font-normal text-gray-500"> · {line.variant}</span>}
                            </p>
                            {line.modifiers.length > 0 && <p className="text-sm leading-snug text-gray-600 [overflow-wrap:anywhere]">{line.modifiers.join(', ')}</p>}
                            {line.notes && <p className="text-sm leading-snug text-gray-500 italic [overflow-wrap:anywhere]">“{line.notes}”</p>}
                            {line.unitCents != null && line.quantity > 1 && <p className="text-sm text-gray-500 tabular-nums">{formatPeso(line.unitCents)} each</p>}
                            {line.changedFrom != null && <p className="text-sm text-amber-700">Price changed from {formatPeso(line.changedFrom)}</p>}
                        </div>

                        {line.totalCents !== undefined && (
                            <span className="shrink-0 text-base font-semibold text-gray-900 tabular-nums">{line.totalCents !== null ? formatPeso(line.totalCents) : '…'}</span>
                        )}
                    </div>
                ))}
            </div>

            {notes && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                    <strong>Order note:</strong> {notes}
                </p>
            )}

            <div className="space-y-1 rounded-lg bg-gray-50 p-4">
                {summary.map((row) => (
                    <div key={row.label} className="flex justify-between text-base text-gray-600">
                        <span>{row.label}</span>
                        <span className={`font-medium tabular-nums ${row.tone === 'discount' ? 'text-green-700' : 'text-gray-900'}`}>{row.value}</span>
                    </div>
                ))}
                <div className="mt-1 flex items-baseline justify-between border-t border-gray-200 pt-2">
                    <span className="text-lg font-bold text-gray-900">{totalLabel}</span>
                    <span className="text-3xl font-bold text-blue-600 tabular-nums">{formatPeso(totalCents)}</span>
                </div>
            </div>

            {problem && lines.length > 0 && (
                <p className="text-destructive text-sm" role="alert">
                    {problem}
                </p>
            )}

            <DialogFooter className="gap-1.5 sm:gap-1.5">
                <Button type="button" variant="ghost" className="h-12" onClick={onBack}>
                    Back to order
                </Button>
                {onSaveLater && (
                    <Button type="button" variant="outline" className="h-12" disabled={!canContinue || saving} onClick={onSaveLater}>
                        Save, pay later
                    </Button>
                )}
                {canPay && (
                    <Button type="button" className="h-14 flex-1" disabled={!canContinue} autoFocus onClick={onContinue}>
                        Continue to payment
                    </Button>
                )}
            </DialogFooter>
        </div>
    );
}