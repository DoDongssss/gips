import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';

import { formatPeso } from '@/lib/money';
import { printHtml } from '@/lib/print';
import type { PaymentBreakdownRow, XReport, ZReportRecord } from '@/lib/reports';

// Inline styles only: the same markup is shown on screen and printed from an isolated 80 mm frame.
const mono = { fontFamily: "'Courier New', monospace", fontSize: 12, lineHeight: 1.35, color: '#000' } as const;

function Row({ left, right, bold }: { left: string; right?: string; bold?: boolean }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontWeight: bold ? 700 : 400 }}>
            <span>{left}</span>
            {right !== undefined && <span style={{ whiteSpace: 'nowrap' }}>{right}</span>}
        </div>
    );
}

function Rule() {
    return <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />;
}

function Heading({ children }: { children: ReactNode }) {
    return <div style={{ fontWeight: 700, margin: '2px 0' }}>{children}</div>;
}

function Paper({ children }: { children: ReactNode }) {
    return <div style={{ ...mono, width: '72mm', maxWidth: '100%', margin: '0 auto', padding: 8, background: '#fff' }}>{children}</div>;
}

const dateTime = (value: string) => new Date(value).toLocaleString();

function Payments({ rows }: { rows: PaymentBreakdownRow[] }) {
    if (rows.length === 0) {
        return <Row left="No payments" />;
    }

    return (
        <>
            {rows.map((row) => (
                <div key={row.code} style={{ marginBottom: 3 }}>
                    <Row left={`${row.name} (${row.count})`} right={formatPeso(row.amount_cents)} />
                    {row.refunds_cents > 0 && <Row left="  Refunded" right={`−${formatPeso(row.refunds_cents)}`} />}
                    {row.refunds_cents > 0 && <Row left="  Net" right={formatPeso(row.net_cents)} />}
                </div>
            ))}
        </>
    );
}

export function XReportPaper({ report }: { report: XReport }) {
    const s = report.summary;
    const cash = report.cash;

    return (
        <Paper>
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14 }}>X REPORT</div>
            <div style={{ textAlign: 'center' }}>Snapshot only. Nothing is reset.</div>
            <Rule />
            <Row left="Business date" right={report.business_date} />
            <Row left="Scope" right={report.scope === 'shift' ? `Shift: ${report.cashier ?? ''}` : 'Whole day'} />
            <Row left="Printed" right={dateTime(report.generated_at)} />
            <Row left="By" right={report.generated_by} />
            <Rule />
            <Row left="Orders" right={String(s.orders_count)} />
            <Row left="Gross sales" right={formatPeso(s.gross_sales_cents)} />
            <Row left="Discounts" right={`−${formatPeso(s.discounts_cents)}`} />
            <Row left="Refunds" right={`−${formatPeso(s.refunds_cents)}`} />
            <Row left="NET SALES" right={formatPeso(s.net_sales_cents)} bold />
            <Row left="Tax" right={formatPeso(s.tax_cents)} />
            <Row left="Tips" right={formatPeso(s.tips_cents)} />
            <Row left={`Voids (${s.voids_count})`} right={formatPeso(s.voids_cents)} />
            <Rule />
            <Heading>Payments</Heading>
            <Payments rows={s.payments} />
            {cash && (
                <>
                    <Rule />
                    <Heading>Cash drawer</Heading>
                    <Row left="Opening cash" right={formatPeso(cash.opening_cents)} />
                    <Row left="Cash sales" right={formatPeso(cash.cash_sales_cents)} />
                    <Row left="Cash tips" right={formatPeso(cash.cash_tips_cents)} />
                    <Row left="Cash in" right={formatPeso(cash.cash_in_cents)} />
                    <Row left="Cash out / drops" right={`−${formatPeso(cash.cash_out_cents)}`} />
                    <Row left="Cash refunds" right={`−${formatPeso(cash.cash_refunds_cents)}`} />
                    <Row left="EXPECTED IN DRAWER" right={formatPeso(cash.expected_cents)} bold />
                </>
            )}
        </Paper>
    );
}

export function ZReportPaper({ report }: { report: ZReportRecord }) {
    const snap = report.snapshot;

    return (
        <Paper>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{snap.business.name}</div>
                {snap.business.address && <div>{snap.business.address}</div>}
                {snap.business.tin && <div>TIN {snap.business.tin}</div>}
                <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>Z REPORT {report.report_number}</div>
            </div>
            <Rule />
            <Row left="Business date" right={report.business_date} />
            <Row left="Issued" right={dateTime(report.generated_at)} />
            <Row left="By" right={report.generated_by ?? ''} />
            <Rule />
            <Row left="Orders" right={String(report.orders_count)} />
            <Row left="Gross sales" right={formatPeso(report.gross_sales_cents)} />
            <Row left="Discounts" right={`−${formatPeso(report.discounts_cents)}`} />
            <Row left="Refunds" right={`−${formatPeso(report.refunds_cents)}`} />
            <Row left="NET SALES" right={formatPeso(report.net_sales_cents)} bold />
            <Row left="Tax" right={formatPeso(report.tax_cents)} />
            <Row left="Tips" right={formatPeso(snap.tips_cents)} />
            <Row left={`Voids (${snap.voids_count})`} right={formatPeso(snap.voids_cents)} />
            <Rule />
            <Heading>Payments</Heading>
            <Payments rows={report.payments_breakdown} />
            <Rule />
            <Heading>Cash drawer (all shifts)</Heading>
            <Row left="Opening cash" right={formatPeso(report.opening_cash_cents)} />
            <Row left="Expected" right={formatPeso(report.expected_cash_cents)} />
            <Row left="Counted" right={formatPeso(report.counted_cash_cents)} />
            <Row left="VARIANCE" right={formatPeso(report.variance_cents)} bold />
            {snap.shifts.length > 0 && (
                <>
                    <Rule />
                    <Heading>Shifts</Heading>
                    {snap.shifts.map((shift, index) => (
                        <div key={index} style={{ marginBottom: 3 }}>
                            <Row left={shift.cashier} right={formatPeso(shift.counted_cash_cents ?? 0)} />
                            <Row left="  Variance" right={formatPeso(shift.variance_cents ?? 0)} />
                        </div>
                    ))}
                </>
            )}
            {snap.unpaid_orders > 0 && (
                <>
                    <Rule />
                    <div>{snap.unpaid_orders} order(s) were left unpaid and are not in the sales above.</div>
                </>
            )}
        </Paper>
    );
}

export function printXReport(report: XReport): void {
    printHtml('X report', renderToStaticMarkup(<XReportPaper report={report} />));
}

export function printZReport(report: ZReportRecord): void {
    printHtml(report.report_number, renderToStaticMarkup(<ZReportPaper report={report} />));
}
