import { Head } from '@inertiajs/react';
import { useState } from 'react';

import { Can } from '@/components/can';
import { CloseShiftDialog } from '@/pages/shifts/close-dialog';
import { MovementDialog } from '@/pages/shifts/movement-dialog';
import { ReopenDialog } from '@/components/reopen-dialog';
import { printShift, ShiftPaper } from '@/components/reports/shift-paper';
import { XReportButton } from '@/components/reports/x-report-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCan } from '@/hooks/use-can';
import { formatPeso } from '@/lib/money';
import OpenShiftDialog from '@/pages/shifts/open-shift-dialog';
import { index } from '@/routes/shifts';

type Movement = {
    id: number;
    type: string;
    label: string;
    amount_cents: number;
    reason: string | null;
    by: string | null;
    at: string | null;
};

type CashBreakdown = {
    opening_cents: number;
    cash_sales_cents: number;
    cash_tips_cents: number;
    cash_in_cents: number;
    cash_out_cents: number;
    cash_refunds_cents: number;
    expected_cents: number;
};

type ShiftRecord = {
    id: number;
    cashier: string | null;
    status: 'open' | 'closed';
    business_date: string;
    opened_at: string;
    closed_at: string | null;
    opening_cash_cents: number;
    /** Null while a cashier's own shift is open: the drawer is counted blind. */
    expected_cash_cents: number | null;
    counted_cash_cents: number | null;
    variance_cents: number | null;
    notes: string | null;
    cash: CashBreakdown | null;
    movements: Movement[];
};

type Props = {
    current: ShiftRecord | null;
    require_shift: boolean;
    can_view_all: boolean;
    history: ShiftRecord[];
};

const dateTime = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');
const time = (value: string | null) => (value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className={`flex justify-between text-sm ${strong ? 'border-t pt-2 font-semibold' : ''}`}>
            <span className={strong ? '' : 'text-muted-foreground'}>{label}</span>
            <span>{value}</span>
        </div>
    );
}

function VarianceBadge({ cents }: { cents: number | null }) {
    if (cents === null) {
        return <span className="text-muted-foreground">—</span>;
    }

    if (cents === 0) {
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Balanced</Badge>;
    }

    return cents > 0 ? (
        <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">Over {formatPeso(cents)}</Badge>
    ) : (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Short {formatPeso(Math.abs(cents))}</Badge>
    );
}

export default function Index({ current, require_shift, can_view_all, history }: Props) {
    const { can } = useCan();
    const canReopen = can('shift.reopen');
    const [opening, setOpening] = useState(false);
    const [moving, setMoving] = useState(false);
    const [closing, setClosing] = useState(false);
    const [reopening, setReopening] = useState<ShiftRecord | null>(null);
    const [viewing, setViewing] = useState<ShiftRecord | null>(null);

    return (
        <>
            <Head title="Shift" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Shift</h1>
                        <p className="text-muted-foreground text-sm">Your cash drawer: open it, record cash in and out, then count and close.</p>
                    </div>

                    <Can permission="report.view">
                        <XReportButton scope="day" label="Day X report" variant="outline" />
                    </Can>
                </div>

                {current ? (
                    <section className="space-y-4 rounded-lg border p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="font-semibold">Shift open</h2>
                                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Open</Badge>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    {current.cashier} · since {dateTime(current.opened_at)}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Can permission="shift.open">
                                    <XReportButton scope="shift" label="X report" variant="outline" />
                                    <Button variant="outline" onClick={() => setMoving(true)}>
                                        Cash in / out
                                    </Button>
                                </Can>
                                <Can permission="shift.close">
                                    <Button onClick={() => setClosing(true)}>Count &amp; close</Button>
                                </Can>
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <div className="space-y-2">
                                <Row label="Opening cash" value={formatPeso(current.opening_cash_cents)} />
                                {current.cash ? (
                                    <>
                                        <Row label="Cash sales" value={formatPeso(current.cash.cash_sales_cents)} />
                                        {current.cash.cash_tips_cents > 0 && <Row label="Cash tips" value={formatPeso(current.cash.cash_tips_cents)} />}
                                        <Row label="Cash in" value={formatPeso(current.cash.cash_in_cents)} />
                                        <Row label="Cash out" value={`−${formatPeso(current.cash.cash_out_cents)}`} />
                                        <Row label="Cash refunds" value={`−${formatPeso(current.cash.cash_refunds_cents)}`} />
                                        <Row label="Expected in drawer" value={formatPeso(current.cash.expected_cents)} strong />
                                    </>
                                ) : (
                                    <p className="text-muted-foreground bg-muted/50 rounded-md p-3 text-sm">
                                        The expected total stays hidden until you close, so the count is honest. Count the drawer when your shift ends.
                                    </p>
                                )}
                            </div>

                            <div>
                                <h3 className="mb-2 text-sm font-semibold">Cash movements</h3>
                                {current.movements.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">None yet.</p>
                                ) : (
                                    <ul className="divide-y text-sm">
                                        {current.movements.map((m) => (
                                            <li key={m.id} className="flex items-start justify-between gap-3 py-2 first:pt-0">
                                                <div>
                                                    <p className="font-medium">{m.label}</p>
                                                    <p className="text-muted-foreground text-xs">
                                                        {time(m.at)} · {m.by}
                                                        {m.reason && ` · ${m.reason}`}
                                                    </p>
                                                </div>
                                                <span className="font-medium">{formatPeso(m.amount_cents)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed p-6">
                        <div>
                            <h2 className="font-semibold">No open shift</h2>
                            <p className="text-muted-foreground text-sm">
                                {require_shift ? 'You need an open shift before taking orders.' : 'Open a shift to track the cash in your drawer.'}
                            </p>
                        </div>
                        <Can permission="shift.open">
                            <Button onClick={() => setOpening(true)}>Open shift</Button>
                        </Can>
                    </section>
                )}

                <section className="space-y-3">
                    <h2 className="font-semibold">{can_view_all ? 'Recent closed shifts' : 'Your recent shifts'}</h2>

                    {history.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No closed shifts yet.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="text-muted-foreground bg-muted/40 text-left">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">Date</th>
                                        {can_view_all && <th className="px-3 py-2 font-medium">Cashier</th>}
                                        <th className="px-3 py-2 font-medium">Opened – closed</th>
                                        <th className="px-3 py-2 text-right font-medium">Opening</th>
                                        <th className="px-3 py-2 text-right font-medium">Expected</th>
                                        <th className="px-3 py-2 text-right font-medium">Counted</th>
                                        <th className="px-3 py-2 font-medium">Result</th>
                                        <th className="px-3 py-2" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {history.map((s) => (
                                        <tr key={s.id}>
                                            <td className="px-3 py-2">{s.business_date}</td>
                                            {can_view_all && <td className="px-3 py-2">{s.cashier}</td>}
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {time(s.opened_at)} – {time(s.closed_at)}
                                            </td>
                                            <td className="px-3 py-2 text-right">{formatPeso(s.opening_cash_cents)}</td>
                                            <td className="px-3 py-2 text-right">{s.expected_cash_cents === null ? '—' : formatPeso(s.expected_cash_cents)}</td>
                                            <td className="px-3 py-2 text-right">{s.counted_cash_cents === null ? '—' : formatPeso(s.counted_cash_cents)}</td>
                                            <td className="px-3 py-2">
                                                <VarianceBadge cents={s.variance_cents} />
                                            </td>
                                            <td className="px-3 py-2 text-right whitespace-nowrap">
                                                <Button size="sm" variant="ghost" onClick={() => setViewing(s)}>
                                                    View
                                                </Button>
                                                {canReopen && (
                                                    <Button size="sm" variant="outline" className="ml-1" onClick={() => setReopening(s)}>
                                                        Reopen
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Shift report</DialogTitle>
                    </DialogHeader>
                    {viewing && <ShiftPaper shift={viewing} />}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewing(null)}>
                            Close
                        </Button>
                        <Button onClick={() => viewing && printShift(viewing)}>Print</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ReopenDialog
                open={reopening !== null}
                onOpenChange={(open) => !open && setReopening(null)}
                title={`Reopen ${reopening?.cashier ?? 'this'}'s shift?`}
                description="The shift goes back to open and the count is cleared. The cashier counts the drawer again when closing it. It only works while the day is reopened on the Z reports page."
                url={reopening ? `/shifts/${reopening.id}/reopen` : ''}
                confirmLabel="Reopen shift"
            />
            <OpenShiftDialog open={opening} onOpenChange={setOpening} />
            {current && (
                <>
                    <MovementDialog shiftId={current.id} open={moving} onOpenChange={setMoving} />
                    <CloseShiftDialog shiftId={current.id} open={closing} onOpenChange={setClosing} />
                </>
            )}
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Shift', href: index() }],
};
