import { renderToStaticMarkup } from 'react-dom/server';

import { formatPeso } from '@/lib/money';
import { orderTypeLabel } from '@/pages/orders/status-badges';
import type { ReceiptContent } from '@/pages/orders/types';

// Inline styles only: the same markup is shown on screen and printed from an isolated frame,
// where the app's stylesheet does not exist.
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

export function ReceiptView({ content, receiptNumber }: { content: ReceiptContent; receiptNumber: string }) {
    const issued = new Date(content.issued_at).toLocaleString();

    return (
        <div style={{ ...mono, width: '72mm', maxWidth: '100%', margin: '0 auto', padding: 8, background: '#fff' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{content.business.name}</div>
                {content.business.address && <div>{content.business.address}</div>}
                {content.business.phone && <div>{content.business.phone}</div>}
                {content.business.tin && <div>TIN {content.business.tin}</div>}
                {content.header && <div style={{ marginTop: 4 }}>{content.header}</div>}
            </div>

            <Rule />
            <Row left={`Receipt ${receiptNumber}`} />
            <Row left={`Order ${content.order_number}`} right={orderTypeLabel[content.order_type]} />
            <Row left={issued} />
            {content.cashier && <Row left={`Cashier: ${content.cashier}`} />}
            {content.customer_name && <Row left={`Customer: ${content.customer_name}`} />}
            <Rule />

            {content.items.map((item, index) => (
                <div key={index} style={{ marginBottom: 4 }}>
                    <Row
                        left={`${item.quantity} × ${item.name}${item.variant ? ` (${item.variant})` : ''}`}
                        right={formatPeso(item.line_total_cents)}
                    />
                    {item.modifiers.map((modifier, i) => (
                        <div key={i} style={{ paddingLeft: 12 }}>
                            + {modifier.name}
                            {modifier.price_delta_cents !== 0 && ` (${formatPeso(modifier.price_delta_cents)})`}
                        </div>
                    ))}
                    {item.notes && <div style={{ paddingLeft: 12 }}>Note: {item.notes}</div>}
                    {item.discount_cents > 0 && (
                        <div style={{ paddingLeft: 12 }}>Discount −{formatPeso(item.discount_cents)}</div>
                    )}
                </div>
            ))}

            <Rule />
            <Row left="Subtotal" right={formatPeso(content.subtotal_cents)} />
            {content.discounts.map((discount, index) => (
                <Row
                    key={index}
                    left={`${discount.name}${discount.id_number ? ` (${discount.id_number})` : ''}`}
                    right={`−${formatPeso(discount.amount_cents)}`}
                />
            ))}
            {content.tax && (
                <>
                    <Row left={content.tax.is_inclusive ? 'VATable sales' : 'Taxable sales'} right={formatPeso(content.tax.vatable_sales_cents)} />
                    <Row left={`${content.tax.name} ${Number(content.tax.rate)}%`} right={formatPeso(content.tax.tax_cents)} />
                </>
            )}
            <Row left="TOTAL" right={formatPeso(content.total_cents)} bold />

            <Rule />
            {content.payments.map((payment, index) => (
                <div key={index}>
                    <Row left={payment.method} right={formatPeso(payment.amount_cents)} />
                    {payment.tendered_cents !== null && payment.tendered_cents > 0 && (
                        <>
                            <Row left="  Cash received" right={formatPeso(payment.tendered_cents)} />
                            <Row left="  Change" right={formatPeso(payment.change_cents)} />
                        </>
                    )}
                    {payment.reference_no && <Row left={`  Ref ${payment.reference_no}`} />}
                </div>
            ))}
            {content.tip_cents > 0 && <Row left="Tip" right={formatPeso(content.tip_cents)} />}

            {content.footer && (
                <>
                    <Rule />
                    <div style={{ textAlign: 'center' }}>{content.footer}</div>
                </>
            )}
        </div>
    );
}

/** Prints through an isolated hidden frame, so only the receipt is sent to the printer. */
export function printReceipt(content: ReceiptContent, receiptNumber: string): void {
    const html = renderToStaticMarkup(<ReceiptView content={content} receiptNumber={receiptNumber} />);

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);

    const doc = frame.contentDocument;
    const win = frame.contentWindow;

    if (!doc || !win) {
        frame.remove();

        return;
    }

    doc.open();
    doc.write(
        `<!doctype html><html><head><meta charset="utf-8"><title>${receiptNumber}</title>` +
            `<style>@page{margin:4mm}body{margin:0}</style></head><body>${html}</body></html>`,
    );
    doc.close();

    win.focus();
    win.print();

    // Give the print dialog time to read the frame before it goes away.
    window.setTimeout(() => frame.remove(), 2000);
}
