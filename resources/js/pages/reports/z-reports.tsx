import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Can } from '@/components/shared/can';
import { ReopenDialog } from '@/components/shared/reopen-dialog';
import { printZReport, ZReportPaper } from '@/components/reports/report-paper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPeso } from '@/lib/money';
import type { ZReportPreview, ZReportRecord } from '@/lib/reports';
import { CashVarianceBadge, ZReportIssuedPanel, ZReportPreviewPanel } from '@/pages/reports/z-report-day-panel';
import { index as shiftsIndex } from '@/routes/shifts';
import { index, store } from '@/routes/z-reports';

type OpenShift = { id: number; cashier: string; business_date: string };

type Props = {
    day: {
        business_date: string;
        blockers: string[];
        open_shifts: OpenShift[];
    };
    issued: ZReportRecord | null;
    preview?: ZReportPreview;
    reports?: ZReportRecord[];
    pending_days: string[];
    reopened_days: string[];
    current_date: string;
};

const DAY_ONLY = ['day', 'issued', 'preview'];
const REPORTS_ONLY = ['reports'];

export default function ZReports({ day, issued, preview, reports, pending_days, reopened_days, current_date }: Props) {
    const [confirming, setConfirming] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [loadingReports, setLoadingReports] = useState(false);
    const [viewing, setViewing] = useState<ZReportRecord | null>(null);
    const [reopening, setReopening] = useState<ZReportRecord | null>(null);

    const [loadedPreview, setLoadedPreview] = useState<ZReportPreview | undefined>(preview);
    const [loadedReports, setLoadedReports] = useState<ZReportRecord[] | undefined>(reports);

    const previewData = preview ?? loadedPreview;
    const reportsData = reports ?? loadedReports;
    const isClosed = issued !== null;
    const blocked = !isClosed && day.blockers.length > 0;

    useEffect(() => {
        if (preview) {
            setLoadedPreview(preview);
        } else if (loadedPreview && !isClosed) {
            loadPreview();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preview]);

    useEffect(() => {
        if (reports) {
            setLoadedReports(reports);
        } else if (loadedReports) {
            loadReports();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reports]);

    function pickDate(date: string) {
        router.get(index.url(), { date }, { preserveScroll: true, preserveState: true, only: DAY_ONLY });
    }

    function loadPreview() {
        router.reload({
            only: DAY_ONLY,
            onStart: () => setLoadingPreview(true),
            onFinish: () => setLoadingPreview(false),
        });
    }

    function loadReports() {
        router.reload({
            only: REPORTS_ONLY,
            onStart: () => setLoadingReports(true),
            onFinish: () => setLoadingReports(false),
        });
    }

    function generate() {
        router.post(
            store.url(),
            { business_date: day.business_date },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => setConfirming(false),
                onError: (errors) => {
                    setConfirming(false);
                    toast.error(Object.values(errors)[0] ?? 'The Z report could not be issued.');
                },
            },
        );
    }

    const dayPickerDates = [...new Set([...pending_days, current_date])].sort();

    return (
        <>
            <Head title="Z reports" />

            <div className="space-y-6 p-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Z reports</h1>
                    <p className="text-muted-foreground text-sm">The end-of-day close. Once issued, that day&apos;s sales are locked.</p>
                </div>

                {pending_days.length > 0 ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        <p className="font-medium">Days without a Z report</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {dayPickerDates.map((d) => (
                                <Button key={d} size="sm" variant={d === day.business_date ? 'default' : 'outline'} onClick={() => pickDate(d)}>
                                    {d === current_date ? `Today (${d})` : d}
                                    {reopened_days.includes(d) ? ' · reopened' : ''}
                                </Button>
                            ))}
                        </div>
                    </div>
                ) : null}

                <section className="space-y-4 rounded-lg border p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="font-semibold">
                                {day.business_date === current_date ? 'Today' : 'Business day'} · {day.business_date}
                                {reopened_days.includes(day.business_date) && !isClosed ? (
                                    <Badge variant="secondary" className="ml-2">
                                        Reopened
                                    </Badge>
                                ) : null}
                            </h2>
                            <p className="text-muted-foreground text-sm">
                                {isClosed ? `Issued report ${issued.report_number} (locked).` : 'Load a preview before closing the day.'}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {!isClosed && (
                                <Button variant="outline" disabled={loadingPreview} onClick={loadPreview}>
                                    {loadingPreview ? 'Loading…' : 'Load preview'}
                                </Button>
                            )}
                            {isClosed && (
                                <Button variant="outline" onClick={() => setViewing(issued)}>
                                    View / print
                                </Button>
                            )}
                            <Can permission="shift.view-all">
                                <Button disabled={blocked || isClosed || !previewData} onClick={() => setConfirming(true)}>
                                    {isClosed ? 'Day closed' : 'Close the day'}
                                </Button>
                            </Can>
                        </div>
                    </div>

                    {blocked && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                            <p className="font-medium">Fix these before closing the day:</p>
                            <ul className="mt-1 list-disc pl-5">
                                {day.blockers.map((b) => (
                                    <li key={b}>{b}</li>
                                ))}
                            </ul>
                            {day.open_shifts.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    <p className="font-medium">Open shifts</p>
                                    <ul className="space-y-1">
                                        {day.open_shifts.map((shift) => (
                                            <li key={shift.id}>
                                                {shift.cashier} · {shift.business_date} ·{' '}
                                                <Link href={shiftsIndex.url()} className="font-medium underline">
                                                    Go to shifts
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {isClosed ? (
                        <ZReportIssuedPanel report={issued} />
                    ) : previewData ? (
                        <ZReportPreviewPanel preview={previewData} />
                    ) : (
                        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-sm">
                            <p>The preview is not loaded yet.</p>
                            <Button onClick={loadPreview} disabled={loadingPreview}>
                                {loadingPreview ? 'Loading…' : 'Load preview'}
                            </Button>
                        </div>
                    )}
                </section>

                <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="font-semibold">Issued reports</h2>
                        {!reportsData && (
                            <Button variant="outline" size="sm" disabled={loadingReports} onClick={loadReports}>
                                {loadingReports ? 'Loading…' : 'Load history'}
                            </Button>
                        )}
                    </div>

                    {!reportsData ? (
                        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">Load history to see past Z reports.</p>
                    ) : reportsData.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No Z reports yet.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="text-muted-foreground bg-muted/40 text-left">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">Report</th>
                                        <th className="px-3 py-2 font-medium">Business date</th>
                                        <th className="px-3 py-2 font-medium">Issued</th>
                                        <th className="px-3 py-2 text-right font-medium">Orders</th>
                                        <th className="px-3 py-2 text-right font-medium">Gross</th>
                                        <th className="px-3 py-2 text-right font-medium">Net</th>
                                        <th className="px-3 py-2 text-right font-medium">Tax</th>
                                        <th className="px-3 py-2 text-right font-medium">Expected</th>
                                        <th className="px-3 py-2 text-right font-medium">Counted</th>
                                        <th className="px-3 py-2 font-medium">Variance</th>
                                        <th className="px-3 py-2 font-medium">By</th>
                                        <th className="px-3 py-2" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {reportsData.map((z) => (
                                        <tr key={z.id}>
                                            <td className="px-3 py-2 font-medium">{z.report_number}</td>
                                            <td className="px-3 py-2">{z.business_date}</td>
                                            <td className="text-muted-foreground px-3 py-2 whitespace-nowrap" suppressHydrationWarning>
                                                {new Date(z.generated_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums">{z.orders_count}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{formatPeso(z.gross_sales_cents)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{formatPeso(z.net_sales_cents)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{formatPeso(z.tax_cents)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{formatPeso(z.expected_cash_cents)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{formatPeso(z.counted_cash_cents)}</td>
                                            <td className="px-3 py-2">
                                                {z.variance_cents === 0 ? (
                                                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Balanced</Badge>
                                                ) : z.variance_cents > 0 ? (
                                                    <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">Over {formatPeso(z.variance_cents)}</Badge>
                                                ) : (
                                                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Short {formatPeso(Math.abs(z.variance_cents))}</Badge>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">{z.generated_by ?? '—'}</td>
                                            <td className="px-3 py-2 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => setViewing(z)}>
                                                        View
                                                    </Button>
                                                    <Can permission="report.reopen">
                                                        <Button size="sm" variant="outline" onClick={() => setReopening(z)}>
                                                            Reopen day
                                                        </Button>
                                                    </Can>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            <Dialog open={confirming} onOpenChange={setConfirming}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Close {day.business_date}?</DialogTitle>
                        <DialogDescription>
                            This issues the Z report and locks the day. If you close it by mistake, someone with permission can reopen the day.
                        </DialogDescription>
                    </DialogHeader>
                    {previewData && !isClosed && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <p>
                                Net sales: <span className="font-medium tabular-nums">{formatPeso(previewData.summary.net_sales_cents)}</span>
                            </p>
                            <p>
                                Orders: <span className="font-medium tabular-nums">{previewData.summary.orders_count}</span>
                            </p>
                            <p className="flex flex-wrap items-center gap-1">
                                Cash variance: <CashVarianceBadge varianceCents={previewData.cash.variance_cents} />
                            </p>
                            <p>
                                Unpaid: <span className="font-medium tabular-nums">{previewData.unpaid_orders}</span>
                            </p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirming(false)}>
                            Not yet
                        </Button>
                        <Button onClick={generate} disabled={processing || !previewData}>
                            {processing ? 'Issuing…' : 'Issue Z report'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ReopenDialog
                open={reopening !== null}
                onOpenChange={(open) => !open && setReopening(null)}
                title={`Reopen ${reopening?.business_date ?? 'this day'}?`}
                description={`This removes Z report ${reopening?.report_number ?? ''}. The day accepts orders and shifts again, and closing it later issues a new Z report with a new number. The removed report is kept in the audit log.`}
                url={reopening ? `/z-reports/${reopening.id}/reopen` : ''}
                confirmLabel="Reopen day"
            />

            <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{viewing?.report_number}</DialogTitle>
                        <DialogDescription>Issued report. Reprinting does not change anything.</DialogDescription>
                    </DialogHeader>
                    {viewing && <ZReportPaper report={viewing} />}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewing(null)}>
                            Close
                        </Button>
                        <Button onClick={() => viewing && printZReport(viewing)}>Print</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

ZReports.layout = {
    breadcrumbs: [{ title: 'Z reports', href: index() }],
};
