import { formatPeso } from '@/lib/money';
import type { PaymentBreakdownRow, ReportSummary, ZReportDayCash, ZReportDayShift, ZReportPreview, ZReportRecord } from '@/lib/reports';

export function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="text-lg font-semibold tabular-nums">{value}</p>
        </div>
    );
}

export function CashVarianceBadge({ varianceCents }: { varianceCents: number }) {
    if (varianceCents === 0) {
        return <span className="text-muted-foreground text-xs">Balanced</span>;
    }

    if (varianceCents > 0) {
        return <span className="text-sky-700 text-xs">Over {formatPeso(varianceCents)}</span>;
    }

    return <span className="text-red-700 text-xs">Short {formatPeso(Math.abs(varianceCents))}</span>;
}

export function PaymentBreakdownList({ rows }: { rows: PaymentBreakdownRow[] }) {
    if (rows.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium">Payments</h3>
            <div className="space-y-2 text-sm">
                {rows.map((p) => (
                    <div key={p.code} className="rounded-md border px-3 py-2">
                        <div className="flex justify-between font-medium">
                            <span>
                                {p.name} ({p.count})
                            </span>
                            <span className="tabular-nums">{formatPeso(p.amount_cents)}</span>
                        </div>
                        {p.refunds_cents > 0 && (
                            <div className="text-muted-foreground flex justify-between text-xs">
                                <span>Refunded</span>
                                <span className="tabular-nums">−{formatPeso(p.refunds_cents)}</span>
                            </div>
                        )}
                        {p.refunds_cents > 0 && (
                            <div className="flex justify-between text-xs">
                                <span>Net</span>
                                <span className="tabular-nums">{formatPeso(p.net_cents)}</span>
                            </div>
                        )}
                        {p.refunds_cents === 0 && (
                            <div className="text-muted-foreground flex justify-end text-xs tabular-nums">{formatPeso(p.net_cents)} net</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function SalesStats({ summary }: { summary: ReportSummary }) {
    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Orders" value={summary.orders_count.toLocaleString()} />
            <Stat label="Gross sales" value={formatPeso(summary.gross_sales_cents)} />
            <Stat label="Discounts" value={formatPeso(summary.discounts_cents)} />
            <Stat label="Refunds" value={formatPeso(summary.refunds_cents)} />
            <Stat label="Net sales" value={formatPeso(summary.net_sales_cents)} />
            <Stat label="Tax" value={formatPeso(summary.tax_cents)} />
            <Stat label="Tips" value={formatPeso(summary.tips_cents)} />
            <Stat label="Voids" value={`${summary.voids_count} · ${formatPeso(summary.voids_cents)}`} />
        </div>
    );
}

function CashDrawerSummary({ cash }: { cash: ZReportDayCash }) {
    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium">Cash drawer (all shifts)</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
                Variance is cash-only: opening float plus cash sales and movements, compared to what was counted. E-wallet and card totals in Payments above are not in the drawer.
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Opening" value={formatPeso(cash.opening_cents)} />
                <Stat label="Expected" value={formatPeso(cash.expected_cents)} />
                <Stat label="Counted" value={formatPeso(cash.counted_cents)} />
                <Stat label="Variance" value={formatPeso(cash.variance_cents)} />
            </div>
        </div>
    );
}

function ShiftCashList({ shifts }: { shifts: ZReportDayShift[] }) {
    if (shifts.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium">Shifts</h3>
            <ul className="divide-y rounded-lg border text-sm">
                {shifts.map((shift, index) => (
                    <li key={index} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                        <span className="font-medium">{shift.cashier}</span>
                        <span className="text-muted-foreground tabular-nums">
                            Counted {formatPeso(shift.counted_cash_cents ?? 0)} · Variance {formatPeso(shift.variance_cents ?? 0)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function ZReportPreviewPanel({ preview }: { preview: ZReportPreview }) {
    return (
        <div className="space-y-4">
            <SalesStats summary={preview.summary} />
            <PaymentBreakdownList rows={preview.summary.payments} />
            <CashDrawerSummary cash={preview.cash} />
            <ShiftCashList shifts={preview.shifts} />
            {preview.unpaid_orders > 0 && (
                <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
                    {preview.unpaid_orders} order(s) are still unpaid and are not included in net sales above.
                </p>
            )}
        </div>
    );
}

export function ZReportIssuedPanel({ report }: { report: ZReportRecord }) {
    const summary: ReportSummary = {
        from: report.business_date,
        to: report.business_date,
        orders_count: report.orders_count,
        gross_sales_cents: report.gross_sales_cents,
        discounts_cents: report.discounts_cents,
        refunds_cents: report.refunds_cents,
        net_sales_cents: report.net_sales_cents,
        tax_cents: report.tax_cents,
        tips_cents: report.snapshot.tips_cents,
        voids_count: report.snapshot.voids_count,
        voids_cents: report.snapshot.voids_cents,
        payments: report.payments_breakdown,
    };

    const cash: ZReportDayCash = {
        opening_cents: report.opening_cash_cents,
        expected_cents: report.expected_cash_cents,
        counted_cents: report.counted_cash_cents,
        variance_cents: report.variance_cents,
    };

    return (
        <div className="space-y-4">
            {report.snapshot.business.name && (
                <div className="text-sm">
                    <p className="font-medium">{report.snapshot.business.name}</p>
                    {report.snapshot.business.address && <p className="text-muted-foreground">{report.snapshot.business.address}</p>}
                    {report.snapshot.business.tin && <p className="text-muted-foreground">TIN {report.snapshot.business.tin}</p>}
                </div>
            )}
            <p className="text-muted-foreground text-sm">
                Issued {new Date(report.generated_at).toLocaleString()} by {report.generated_by ?? '—'}
            </p>
            <SalesStats summary={summary} />
            <PaymentBreakdownList rows={report.payments_breakdown} />
            <CashDrawerSummary cash={cash} />
            <ShiftCashList shifts={report.snapshot.shifts} />
            {report.snapshot.unpaid_orders > 0 && (
                <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
                    {report.snapshot.unpaid_orders} order(s) were left unpaid and are not in the sales totals above.
                </p>
            )}
        </div>
    );
}
