import { EscPos, columnsFor } from '@/lib/printer/escpos';
import type { PrintJob } from '@/lib/printer/receipt';
import type { PlacedOrder } from '@/types/kiosk';
import type { BusinessInfo, PrinterSettings } from '@/types/printer';

const money = (cents: number) => `PHP ${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Customer pickup ticket after a kiosk order is placed (pay at counter). */
export function kioskTicket(placed: PlacedOrder, business: BusinessInfo, settings: PrinterSettings): PrintJob {
    const columns = columnsFor(settings.printer_paper_width);
    const e = new EscPos(columns);
    const html: string[] = [];
    const center = (text: string, bold = false) => html.push(`<div style="text-align:center${bold ? ';font-weight:bold' : ''}">${text}</div>`);
    const row = (left: string, right: string) => html.push(`<div style="display:flex;justify-content:space-between;gap:8px"><span>${left}</span><span>${right}</span></div>`);
    const rule = () => html.push('<hr style="border:0;border-top:1px dashed #000;margin:6px 0">');

    e.align('center');
    if (business.name) {
        e.bold(true).line(business.name).bold(false);
        center(business.name, true);
    }

    e.bold(true).size(2, 2).line('KIOSK ORDER').size(1, 1).bold(false);
    center('KIOSK ORDER', true);
    rule();

    e.align('center').bold(true).size(3, 3).line(placed.order_number).size(1, 1).bold(false);
    center(placed.order_number, true);
    e.align('left').rule();
    rule();

    const type = placed.type === 'dine_in' ? 'Dine in' : 'Takeout';
    e.line(type);
    row('Type', type);

    placed.items.forEach((item) => {
        const label = `${item.quantity}x ${item.name}${item.variant ? ` (${item.variant})` : ''}`;
        e.pair(label, money(item.line_total_cents));
        row(label, money(item.line_total_cents));
        item.modifiers.forEach((mod) => {
            if (mod.price_delta_cents !== 0) {
                e.line(`  + ${mod.name}`);
            }
        });
    });

    e.rule();
    rule();
    e.bold(true).pair('Total', money(placed.total_cents)).bold(false);
    row('Total', money(placed.total_cents));

    e.align('center').line('Pay at the counter').line('Keep this ticket');
    center('Pay at the counter');
    center('Keep this ticket');

    if (placed.requires_verification) {
        e.line('Show senior/PWD ID to cashier');
        center('Show senior/PWD ID to cashier');
    }

    e.feed(3).cut();

    return { bytes: e.build(), html: html.join('') };
}
