import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatPeso } from '@/lib/money';

export type ReviewLine = {
    key: string;
    name: string;
    variant?: string | null;
    modifiers: string[];
    notes?: string | null;
    quantity: number;
    unitCents?: number | null;
    totalCents?: number | null;
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

/** Step 1 of checkout: tall dialog so many line items scroll in one place. */
export function OrderReview({
    title,
    typeLabel,
    customer,
    notes,
    lines,
    loading,
    problem,
    summary,
    totalLabel,
    totalCents,
    canContinue,
    onBack,
    onContinue,
    onSaveLater,
    saving,
    canPay,
}: Props) {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);

    return (
        <div className="flex h-full min-h-0 flex-col">
            <DialogHeader className="shrink-0 gap-1 border-b border-gray-200 pb-3 text-left">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <DialogTitle className="text-lg">{title}</DialogTitle>
                        <DialogDescription className="text-sm">Check the order with the customer before payment.</DialogDescription>
                    </div>
                    <p className="shrink-0 text-right">
                        <span className="text-muted-foreground block text-xs">{totalLabel}</span>
                        <span className="text-2xl font-bold text-blue-600 tabular-nums">{formatPeso(totalCents)}</span>
                    </p>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 font-medium text-blue-700">{typeLabel}</span>
                    <span className="rounded-md bg-gray-200 px-2 py-0.5 font-medium text-gray-700 tabular-nums">
                        {count} {count === 1 ? 'item' : 'items'}
                    </span>
                    {customer && <span className="text-gray-600">for {customer}</span>}
                </div>
            </DialogHeader>

            {(notes || (problem && lines.length > 0)) && (
                <div className="shrink-0 space-y-2 py-2">
                    {notes && (
                        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                            <strong>Order note:</strong> {notes}
                        </p>
                    )}
                    {problem && lines.length > 0 && (
                        <p className="text-destructive rounded-lg bg-red-50 p-3 text-sm" role="alert">
                            {problem}
                        </p>
                    )}
                </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col py-2">
                <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-gray-200 bg-white shadow-sm" aria-label="Order items">
                    <div className="text-muted-foreground shrink-0 border-b border-gray-100 px-4 py-2.5 text-xs font-medium tracking-wide uppercase sm:px-5">
                        Items ({lines.length} {lines.length === 1 ? 'line' : 'lines'})
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                        {loading && <p className="text-muted-foreground p-6 text-center text-base">Loading the order…</p>}

                        {!loading && lines.length === 0 && (
                            <p className="text-muted-foreground p-6 text-center text-base">{problem ?? 'No items to show.'}</p>
                        )}

                        {!loading && lines.length > 0 && (
                            <ul className="divide-y divide-gray-100">
                                {lines.map((line) => (
                                    <li key={line.key} className="flex items-start gap-4 px-4 py-3 sm:px-5">
                                        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-blue-600 text-sm font-bold text-white tabular-nums">
                                            {line.quantity}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <p className="text-base leading-snug font-medium text-gray-900 [overflow-wrap:anywhere]">
                                                {line.name}
                                                {line.variant && <span className="font-normal text-gray-500"> · {line.variant}</span>}
                                            </p>
                                            {line.modifiers.length > 0 && (
                                                <p className="text-sm leading-snug text-gray-600 [overflow-wrap:anywhere]">{line.modifiers.join(', ')}</p>
                                            )}
                                            {line.notes && (
                                                <p className="text-sm leading-snug text-gray-500 italic [overflow-wrap:anywhere]">“{line.notes}”</p>
                                            )}
                                            {line.unitCents != null && line.quantity > 1 && (
                                                <p className="text-sm text-gray-500 tabular-nums">{formatPeso(line.unitCents)} each</p>
                                            )}
                                            {line.changedFrom != null && (
                                                <p className="text-sm text-amber-700">Price changed from {formatPeso(line.changedFrom)}</p>
                                            )}
                                        </div>

                                        {line.totalCents !== undefined && (
                                            <span className="min-w-[5.5rem] shrink-0 text-right text-base font-semibold text-gray-900 tabular-nums">
                                                {line.totalCents !== null ? formatPeso(line.totalCents) : '…'}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-5 sm:py-4">
                        <dl className="mx-auto max-w-md space-y-1.5 sm:ml-auto sm:max-w-sm">
                            {summary.map((row) => (
                                <div key={row.label} className="flex justify-between gap-6 text-sm text-gray-600">
                                    <dt>{row.label}</dt>
                                    <dd className={cn('font-medium tabular-nums', row.tone === 'discount' ? 'text-green-700' : 'text-gray-900')}>
                                        {row.value}
                                    </dd>
                                </div>
                            ))}
                            <div className="flex items-baseline justify-between gap-6 border-t border-gray-300 pt-2">
                                <span className="text-base font-bold text-gray-900">{totalLabel}</span>
                                <span className="text-2xl font-bold text-blue-600 tabular-nums">{formatPeso(totalCents)}</span>
                            </div>
                        </dl>
                    </div>
                </section>
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t border-gray-200 pt-3 sm:justify-between">
                <Button type="button" variant="ghost" className="h-11" onClick={onBack}>
                    Back to order
                </Button>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                    {onSaveLater && (
                        <Button type="button" variant="outline" className="h-11" disabled={!canContinue || saving} onClick={onSaveLater}>
                            Save, pay later
                        </Button>
                    )}
                    {canPay && (
                        <Button type="button" className="h-12 min-w-[180px]" disabled={!canContinue} autoFocus onClick={onContinue}>
                            Continue to payment
                        </Button>
                    )}
                </div>
            </DialogFooter>
        </div>
    );
}
