import { formatPeso } from '@/lib/money';

export type ShiftPaperData = {
    id: number;
    cashier: string | null;
    business_date: string;
    opened_at: string;
    closed_at: string | null;
    opening_cash_cents: number;
    expected_cash_cents: number | null;
    counted_cash_cents: number | null;
    variance_cents: number | null;
    notes: string | null;
    cash: {
        cash_sales_cents: number;
        cash_tips_cents: number;
        cash_in_cents: number;
        cash_out_cents: number;
        cash_refunds_cents: number;
    } | null;
    movements: { id: number; label: string; amount_cents: number; reason: string | null }[];
};

const stamp = (v: string | null) => (v ? new Date(v).toLocaleString() : '—');

type Line = { label: string; value: string; strong?: boolean };

function lines(s: ShiftPaperData): Line[] {
    const out: Line[] = [{ label: 'Opening cash', value: formatPeso(s.opening_cash_cents) }];

    if (s.cash) {
        out.push({ label: 'Cash sales', value: formatPeso(s.cash.cash_sales_cents) });
        if (s.cash.cash_tips_cents > 0) out.push({ label: 'Cash tips', value: formatPeso(s.cash.cash_tips_cents) });
        if (s.cash.cash_in_cents > 0) out.push({ label: 'Cash in', value: formatPeso(s.cash.cash_in_cents) });
        if (s.cash.cash_out_cents > 0) out.push({ label: 'Cash out', value: `-${formatPeso(s.cash.cash_out_cents)}` });
        if (s.cash.cash_refunds_cents > 0) out.push({ label: 'Cash refunds', value: `-${formatPeso(s.cash.cash_refunds_cents)}` });
    }

    out.push({ label: 'Expected cash', value: s.expected_cash_cents === null ? '—' : formatPeso(s.expected_cash_cents), strong: true });
    out.push({ label: 'Counted cash', value: s.counted_cash_cents === null ? '—' : formatPeso(s.counted_cash_cents) });

    const v = s.variance_cents;
    out.push({
        label: 'Result',
        value: v === null ? '—' : v === 0 ? 'Balanced' : v > 0 ? `Over ${formatPeso(v)}` : `Short ${formatPeso(-v)}`,
        strong: true,
    });

    return out;
}

/** On-screen shift sheet, same look as the Z report paper. */
export function ShiftPaper({ shift }: { shift: ShiftPaperData }) {
    return (
        <div className="mx-auto w-full max-w-sm space-y-3 rounded-md border bg-white p-4 font-mono text-xs text-black">
            <div className="text-center">
                <p className="text-sm font-bold">SHIFT REPORT</p>
                <p>Business date {shift.business_date}</p>
            </div>
            <div className="space-y-0.5 border-y border-dashed py-2">
                <div className="flex justify-between"><span>Cashier</span><span>{shift.cashier ?? '—'}</span></div>
                <div className="flex justify-between"><span>Opened</span><span>{stamp(shift.opened_at)}</span></div>
                <div className="flex justify-between"><span>Closed</span><span>{stamp(shift.closed_at)}</span></div>
            </div>
            <div className="space-y-0.5">
                {lines(shift).map((l) => (
                    <div key={l.label} className={`flex justify-between ${l.strong ? 'border-t border-dashed pt-1 font-bold' : ''}`}>
                        <span>{l.label}</span>
                        <span>{l.value}</span>
                    </div>
                ))}
            </div>
            {shift.movements.length > 0 && (
                <div className="space-y-0.5 border-t border-dashed pt-2">
                    <p className="font-bold">Cash movements</p>
                    {shift.movements.map((m) => (
                        <div key={m.id} className="flex justify-between gap-2">
                            <span>{m.label}{m.reason ? ` - ${m.reason}` : ''}</span>
                            <span>{formatPeso(m.amount_cents)}</span>
                        </div>
                    ))}
                </div>
            )}
            {shift.notes && <p className="border-t border-dashed pt-2">Note: {shift.notes}</p>}
        </div>
    );
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Prints the shift sheet through a hidden frame (80mm paper width). */
export function printShift(shift: ShiftPaperData) {
    const rows = lines(shift)
        .map((l) => `<div class="r${l.strong ? ' b' : ''}"><span>${esc(l.label)}</span><span>${esc(l.value)}</span></div>`)
        .join('');
    const moves = shift.movements
        .map((m) => `<div class="r"><span>${esc(m.label + (m.reason ? ' - ' + m.reason : ''))}</span><span>${esc(formatPeso(m.amount_cents))}</span></div>`)
        .join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Shift ${shift.id}</title><style>
        @page{margin:4mm}body{font-family:monospace;font-size:12px;width:72mm;margin:0 auto;color:#000}
        .c{text-align:center}.r{display:flex;justify-content:space-between;gap:8px}.b{font-weight:bold;border-top:1px dashed #000;padding-top:3px;margin-top:3px}
        hr{border:0;border-top:1px dashed #000;margin:6px 0}.sig{margin-top:28px;border-top:1px solid #000;text-align:center;padding-top:2px}
    </style></head><body>
        <div class="c"><strong>SHIFT REPORT</strong><br>Business date ${esc(shift.business_date)}</div><hr>
        <div class="r"><span>Cashier</span><span>${esc(shift.cashier ?? '-')}</span></div>
        <div class="r"><span>Opened</span><span>${esc(stamp(shift.opened_at))}</span></div>
        <div class="r"><span>Closed</span><span>${esc(stamp(shift.closed_at))}</span></div><hr>
        ${rows}
        ${moves ? `<hr><strong>Cash movements</strong>${moves}` : ''}
        ${shift.notes ? `<hr>Note: ${esc(shift.notes)}` : ''}
        <div class="sig">Cashier signature</div><div class="sig">Manager signature</div>
    </body></html>`;

    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) {
        frame.remove();
        return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    frame.onload = () => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        setTimeout(() => frame.remove(), 1000);
    };
}
