import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Can } from '@/components/shared/can';
import { ReopenDialog } from '@/components/shared/reopen-dialog';
import { printShift, ShiftPaper } from '@/components/reports/shift-paper';
import { XReportButton } from '@/components/reports/x-report-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CloseShiftDialog } from '@/pages/shifts/close-dialog';
import { MovementDialog } from '@/pages/shifts/movement-dialog';
import { ShiftCashRows } from '@/pages/shifts/shift-cash-rows';
import type { ShiftRecord } from '@/types/shifts';
import { formatPeso } from '@/lib/money';
import { index, show } from '@/routes/shifts';
import { index as auditLogsIndex } from '@/routes/audit-logs';
import { index as zReportsIndex } from '@/routes/z-reports';

type Props = {
    shift: ShiftRecord;
    can_view_all: boolean;
    can_close: boolean;
    can_move: boolean;
    can_reopen: boolean;
};

const dateTime = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');

export default function ShiftShow({ shift, can_close, can_move, can_reopen }: Props) {
    const [moving, setMoving] = useState(false);
    const [closing, setClosing] = useState(false);
    const [reopening, setReopening] = useState(false);

    const isOpen = shift.status === 'open';

    return (
        <>
            <Head title={`Shift · ${shift.cashier ?? shift.business_date}`} />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight">{shift.cashier ?? 'Shift'}</h1>
                            <Badge variant={isOpen ? 'default' : 'secondary'}>{isOpen ? 'Open' : 'Closed'}</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Business day {shift.business_date} · opened {dateTime(shift.opened_at)}
                            {shift.closed_at && ` · closed ${dateTime(shift.closed_at)}`}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <Link href={index.url()}>All shifts</Link>
                        </Button>
                        <Can permission="audit.view">
                            <Button variant="ghost" asChild>
                                <Link
                                    href={auditLogsIndex.url({
                                        query: { log: 'shifts', search: String(shift.id) },
                                    })}
                                >
                                    Audit log
                                </Link>
                            </Button>
                        </Can>
                        {isOpen && (
                            <>
                                <XReportButton scope="shift" shiftId={shift.id} variant="outline" />
                                {can_move && (
                                    <Button variant="outline" onClick={() => setMoving(true)}>
                                        Cash in / out
                                    </Button>
                                )}
                                {can_close && (
                                    <Button onClick={() => setClosing(true)}>Count &amp; close</Button>
                                )}
                            </>
                        )}
                        {!isOpen && (
                            <>
                                <Button variant="outline" onClick={() => printShift(shift)}>
                                    Print
                                </Button>
                                {can_reopen && (
                                    <Button variant="outline" onClick={() => setReopening(true)}>
                                        Reopen
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <section className="space-y-2 rounded-lg border p-5">
                        <h2 className="font-semibold">Cash summary</h2>
                        <ShiftCashRows shift={shift} />
                        {!isOpen && shift.variance_cents !== null && (
                            <p className="border-t pt-2 text-sm">
                                Result:{' '}
                                {shift.variance_cents === 0
                                    ? 'Balanced'
                                    : shift.variance_cents > 0
                                      ? `Over ${formatPeso(shift.variance_cents)}`
                                      : `Short ${formatPeso(Math.abs(shift.variance_cents))}`}
                            </p>
                        )}
                        {shift.notes && <p className="text-muted-foreground text-sm">Notes: {shift.notes}</p>}
                    </section>

                    <section className="rounded-lg border p-5">
                        <h2 className="mb-2 font-semibold">Cash movements</h2>
                        {shift.movements.length === 0 ? (
                            <p className="text-muted-foreground text-sm">None recorded.</p>
                        ) : (
                            <ul className="divide-y text-sm">
                                {shift.movements.map((m) => (
                                    <li key={m.id} className="flex justify-between gap-3 py-2 first:pt-0">
                                        <div>
                                            <p className="font-medium">{m.label}</p>
                                            <p className="text-muted-foreground text-xs">{m.reason}</p>
                                        </div>
                                        <span className="tabular-nums">{formatPeso(m.amount_cents)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                {!isOpen && (
                    <div className="rounded-lg border bg-white p-4">
                        <ShiftPaper shift={shift} />
                    </div>
                )}

                <p className="text-muted-foreground text-xs">
                    Need to undo a closed day?{' '}
                    <Link href={zReportsIndex.url()} className="text-primary hover:underline">
                        Z reports
                    </Link>
                </p>
            </div>

            {isOpen && can_move && <MovementDialog shiftId={shift.id} open={moving} onOpenChange={setMoving} />}

            {isOpen && can_close && (
                <CloseShiftDialog
                    shiftId={shift.id}
                    open={closing}
                    onOpenChange={setClosing}
                    closePreviewCents={shift.close_preview_cents}
                />
            )}

            <ReopenDialog
                open={reopening}
                onOpenChange={setReopening}
                title={`Reopen ${shift.cashier ?? 'this'}'s shift?`}
                description="The shift goes back to open and the count is cleared."
                url={`/shifts/${shift.id}/reopen`}
                confirmLabel="Reopen shift"
            />
        </>
    );
}

ShiftShow.layout = {
    breadcrumbs: [{ title: 'Shift', href: index() }],
};
