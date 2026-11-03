import { EscPos, columnsFor, toAscii } from '@/lib/printer/escpos';
import type { BusinessInfo, PrinterSettings } from '@/types/printer';

/** One print job in both forms: ESC/POS bytes for a direct printer, HTML for browser print. */
export type PrintJob = { bytes: Uint8Array; html: string };

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A short receipt that shows the printer works: header, a few lines, totals and a cut. */
export function testReceipt(settings: PrinterSettings, business: BusinessInfo): PrintJob {
    const columns = columnsFor(settings.printer_paper_width);
    const lines: [string, string][] = [
        ['Test item x1', 'PHP 100.00'],
        ['Test item x2', 'PHP 240.00'],
    ];
    const when = new Date().toLocaleString();

    const esc = new EscPos(columns).align('center').bold(true).size(2, 2).line(business.name ?? 'Receipt printer').size(1, 1).bold(false);

    if (business.address) esc.line(business.address);
    if (business.phone) esc.line(business.phone);

    esc.line('PRINTER TEST').line(when).align('left').rule();
    lines.forEach(([left, right]) => esc.pair(left, right));
    esc.rule().bold(true).pair('TOTAL', 'PHP 340.00').bold(false).rule().align('center').line('If you can read this,').line('the printer is set up.').cut();

    const html = [
        `<div style="text-align:center"><strong style="font-size:1.4em">${escapeHtml(business.name ?? 'Receipt printer')}</strong>`,
        business.address ? `<br>${escapeHtml(business.address)}` : '',
        business.phone ? `<br>${escapeHtml(business.phone)}` : '',
        `<br>PRINTER TEST<br>${escapeHtml(when)}</div><hr>`,
        ...lines.map(([l, r]) => `<div style="display:flex;justify-content:space-between"><span>${escapeHtml(l)}</span><span>${escapeHtml(r)}</span></div>`),
        `<hr><div style="display:flex;justify-content:space-between;font-weight:bold"><span>TOTAL</span><span>PHP 340.00</span></div><hr>`,
        `<div style="text-align:center">If you can read this,<br>the printer is set up.</div>`,
    ].join('');

    return { bytes: esc.toBytes(), html };
}

/** Just the drawer pulse, for the "Open cash drawer" test. */
export function drawerPulse(settings: PrinterSettings): PrintJob {
    return { bytes: new EscPos(columnsFor(settings.printer_paper_width)).drawer().toBytes(), html: '' };
}

export { toAscii };
