import { EscPos, columnsFor } from '@/lib/printer/escpos';
import type { PrintJob } from '@/lib/printer/receipt';
import type { ReceiptContent } from '@/pages/orders/types';
import type { PrinterSettings } from '@/types/printer';

const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = (cents: number) => `PHP ${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (rate: string) => `${Math.round(Number(rate) * 10000) / 100}%`;

/** Breaks free text into lines that fit the paper. */
function wrap(text: string, columns: number): string[] {
    const out: string[] = [];

    text.split(/\r?\n/).forEach((paragraph) => {
        let current = '';

        paragraph.split(/\s+/).filter(Boolean).forEach((word) => {
            if ((current + ' ' + word).trim().length > columns) {
                if (current) out.push(current);
                current = word;
            } else {
                current = (current + ' ' + word).trim();
            }
        });

        out.push(current);
    });

    return out;
}

/** The customer's receipt, from the sale receipt the server stored when the order was paid. */
export function saleReceipt(content: ReceiptContent, settings: PrinterSettings, options: { reprint?: boolean } = {}): PrintJob {
    const columns = columnsFor(settings.printer_paper_width);
    const e = new EscPos(columns);
    const html: string[] = [];
    const row = (left: string, right: string, bold = false) => html.push(`<div style="display:flex;justify-content:space-between;gap:8px${bold ? ';font-weight:bold' : ''}"><span>${esc(left)}</span><span>${esc(right)}</span></div>`);
    const note = (text: string) => html.push(`<div style="padding-left:12px">${esc(text)}</div>`);
    const center = (text: string, bold = false) => html.push(`<div style="text-align:center${bold ? ';font-weight:bold' : ''}">${esc(text)}</div>`);
    const rule = () => html.push('<hr style="border:0;border-top:1px dashed #000;margin:6px 0">');

    // Top: who we are
    e.align('center');
    e.bold(true).size(2, 2).line(content.business.name ?? '').size(1, 1).bold(false);
    html.push(`<div style="text-align:center;font-size:1.4em;font-weight:bold">${esc(content.business.name ?? '')}</div>`);

    [content.business.address, content.business.phone, content.business.tin ? `TIN: ${content.business.tin}` : null, content.header].forEach((text) => {
        if (!text) return;
        wrap(text, columns).forEach((line) => e.line(line));
        center(text);
    });

    if (options.reprint) {
        e.bold(true).line('*** REPRINT ***').bold(false);
        center('*** REPRINT ***', true);
    }

    e.align('left').rule();
    rule();

    // The order
    const type = content.order_type === 'dine_in' ? 'Dine in' : content.order_type === 'delivery' ? 'Delivery' : 'Takeout';
    e.bold(true).pair(`Order ${content.order_number}`, type).bold(false);
    row(`Order ${content.order_number}`, type, true);

    const when = new Date(content.issued_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
    e.line(when);
    note(when);

    if (content.cashier) {
        e.line(`Cashier: ${content.cashier}`);
        note(`Cashier: ${content.cashier}`);
    }

    if (content.customer_name) {
        e.line(`Customer: ${content.customer_name}`);
        note(`Customer: ${content.customer_name}`);
    }

    e.rule();
    rule();

    // Items
    content.items.forEach((item) => {
        const name = `${item.quantity} x ${item.name}${item.variant ? ` (${item.variant})` : ''}`;
        e.pair(name, money(item.line_total_cents + item.discount_cents));
        row(name, money(item.line_total_cents + item.discount_cents));

        item.modifiers.forEach((m) => {
            const text = `  + ${m.name}${m.price_delta_cents !== 0 ? ` (${money(m.price_delta_cents)})` : ''}`;
            e.line(text);
            note(text.trim());
        });

        if (item.notes) {
            e.line(`  * ${item.notes}`);
            note(`* ${item.notes}`);
        }

        if (item.discount_cents > 0) {
            e.pair('  Item discount', `-${money(item.discount_cents)}`);
            row('Item discount', `-${money(item.discount_cents)}`);
        }
    });

    e.rule();
    rule();

    // Totals
    e.pair('Subtotal', money(content.subtotal_cents));
    row('Subtotal', money(content.subtotal_cents));

    content.discounts.forEach((d) => {
        e.pair(d.name, `-${money(d.amount_cents)}`);
        row(d.name, `-${money(d.amount_cents)}`);
    });

    if (content.tax) {
        const label = `${content.tax.name} ${pct(content.tax.rate)}${content.tax.is_inclusive ? ' incl.' : ''}`;
        e.pair('Vatable sales', money(content.tax.vatable_sales_cents));
        row('Vatable sales', money(content.tax.vatable_sales_cents));
        e.pair(label, money(content.tax.tax_cents));
        row(label, money(content.tax.tax_cents));
    }

    if (content.tip_cents > 0) {
        e.pair('Tip', money(content.tip_cents));
        row('Tip', money(content.tip_cents));
    }

    e.bold(true).size(1, 2).pair('TOTAL', money(content.total_cents)).size(1, 1).bold(false);
    row('TOTAL', money(content.total_cents), true);
    e.rule();
    rule();

    // Payments
    content.payments.forEach((p) => {
        const paid = p.tendered_cents ?? p.amount_cents;
        e.pair(p.method, money(paid));
        row(p.method, money(paid));

        if (p.reference_no) {
            e.line(`  Ref: ${p.reference_no}`);
            note(`Ref: ${p.reference_no}`);
        }

        if (p.change_cents > 0) {
            e.pair('Change', money(p.change_cents));
            row('Change', money(p.change_cents));
        }
    });

    // Bottom
    if (content.footer) {
        e.rule().align('center');
        rule();
        wrap(content.footer, columns).forEach((line) => e.line(line));
        center(content.footer);
    }

    e.feed(1).cut();

    return { bytes: e.toBytes(), html: html.join('') };
}
