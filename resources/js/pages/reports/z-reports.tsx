import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Can } from '@/components/can';
import { ReopenDialog } from '@/components/reopen-dialog';
import { printZReport, ZReportPaper } from '@/components/reports/report-paper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPeso } from '@/lib/money';
import type { PaymentBreakdownRow, ReportSummary, ZReportRecord } from '@/lib/reports';
import { index, store } from '@/routes/z-reports';

type Props = {
    today: {
        business_date: string;
        /** Reasons the day cannot be closed yet (open shifts, unpaid orders, and so on). */
        blockers: string[];
        preview: ReportSummary;
    };
    reports: ZReportRecord[];
    /** Past days with orders or shifts and no Z report. */
    pending_days: string[];
    current_date: string;
};

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="text-lg font-semibold tabular-nums">{value}</p>
        </div>
    );
}

export default function ZReports({ today, reports, pending_days, current_date }: Props) {
    const [confirming, setConfirming] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [viewing, setViewing] = useState<ZReportRecord | null>(null);
    const [reopening, setReopening] = useState<ZReportRecord | null>(null);

    const { preview, blockers } = today;
    const alreadyClosed = reports.some((r) => r.business_date === today.business_date);
    const blocked = blockers.length > 0;

    function generate() {
        router.post(
            store.url(),
            { business_date: today.business_date },
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

    return (
        <>
            <Head title="Z reports" />

            <div className="space-y-6 p-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Z reports</h1>
                    <p className="text-muted-foreground text-sm">The end-of-day close. Once issued, that day&apos;s sales are locked.</p>
                </div>

                {pending_days.filter((d) => d !== today.business_date).length > 0 || today.business_date !== current_date ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        <p className="font-medium">Days without a Z report</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {[...new Set([...pending_days, current_date])].sort().map((d) => (
                                <Button
                                    key={d}
                                    size="sm"
                                    variant={d === today.business_date ? 'default' : 'outline'}
                                    onClick={() => router.get(index.url(), { date: d }, { preserveScroll: true, preserveState: true })}
                                >
                                    {d === current_date ? `Today (${d})` : d}
                                </Button>
                            ))}
                        </div>
                    </div>
                ) : null}

                <section className="space-y-4 rounded-lg border p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="font-semibold">
                                {today.business_date === current_date ? 'Today' : 'Business day'} · {today.business_date}
                            </h2>
                            <p className="text-muted-foreground text-sm">A live preview of what the Z report will contain.</p>
                        </div>

                        <Can permission="shift.view-all">
                            <Button disabled={blocked || alreadyClosed} onClick={() => setConfirming(true)}>
                                {alreadyClosed ? 'Day closed' : 'Close the day'}
                            </Button>
                        </Can>
                    </div>

                    {blocked && !alreadyClosed && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                            <p className="font-medium">Fix these before closing the day:</p>
                            <ul className="mt-1 list-disc pl-5">
                                {blockers.map((b) => (
                                    <li key={b}>{b}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <Stat label="Orders" value={preview.orders_count.toLocaleString()} />
                        <Stat label="Gross sales" value={formatPeso(preview.gross_sales_cents)} />
                        <Stat label="Discounts" value={formatPeso(preview.discounts_cents)} />
                        <Stat label="Refunds" value={formatPeso(preview.refunds_cents)} />
                        <Stat label="Net sales" value={formatPeso(preview.net_sales_cents)} />
                        <Stat label="Tax" value={formatPeso(preview.tax_cents)} />
                        <Stat label="Tips" value={formatPeso(preview.tips_cents)} />
                        <Stat label="Voids" value={`${preview.voids_count} · ${formatPeso(preview.voids_cents)}`} />
                    </div>

                    {preview.payments.length > 0 && (
                        <div className="space-y-1 text-sm">
                            {preview.payments.map((p: PaymentBreakdownRow) => (
                                <div key={p.code} className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        {p.name} ({p.count})
                                    </span>
                                    <span className="tabular-nums">{formatPeso(p.net_cents)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="space-y-3">
                    <h2 className="font-semibold">Issued reports</h2>

                    {reports.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No Z reports yet.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="text-muted-foreground bg-muted/40 text-left">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">Report</th>
                                        <th className="px-3 py-2 font-medium">Business date</th>
                                        <th className="px-3 py-2 text-right font-medium">Orders</th>
                                        <th className="px-3 py-2 text-right font-medium">Net sales</th>
                                        <th className="px-3 py-2 font-medium">Cash</th>
                                        <th className="px-3 py-2 font-medium">Issued by</th>
                                        <th className="px-3 py-2" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {reports.map((z) => (
                                        <tr key={z.id}>
                                            <td className="px-3 py-2 font-medium">{z.report_number}</td>
                                            <td className="px-3 py-2">{z.business_date}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{z.orders_count}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{formatPeso(z.net_sales_cents)}</td>
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
                        <DialogTitle>Close {today.business_date}?</DialogTitle>
                        <DialogDescription>
                            This issues the Z report and locks the day. If you close it by mistake, someone with permission can reopen the day.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirming(false)}>
                            Not yet
                        </Button>
                        <Button onClick={generate} disabled={processing}>
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
