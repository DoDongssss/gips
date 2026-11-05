import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/shared/can';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPeso } from '@/lib/money';
import type { ReportTable } from '@/lib/reports';
import { index } from '@/routes/reports';

type Props = {
    filters: { type: string; from: string; to: string };
    types: { value: string; label: string }[];
    // Optional on the server: undefined until the person clicks "Run report".
    report?: ReportTable;
};

const ONLY = ['report', 'filters'];

function cell(type: 'text' | 'int' | 'money', value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    if (type === 'money') {
        return formatPeso(Number(value));
    }

    return type === 'int' ? Number(value).toLocaleString() : String(value);
}

function formatDay(iso: string): string {
    return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function addDays(iso: string, days: number): string {
    const date = new Date(iso + 'T12:00:00');
    date.setDate(date.getDate() + days);

    return date.toISOString().slice(0, 10);
}

export default function Index({ filters, types, report }: Props) {
    const [type, setType] = useState(filters.type);
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);
    const [loading, setLoading] = useState(false);

    const [loaded, setLoaded] = useState<ReportTable | undefined>(report);
    const data = report ?? loaded;

    const selectedLabel = useMemo(() => types.find((t) => t.value === filters.type)?.label ?? 'Report', [types, filters.type]);

    function runReport(event?: FormEvent) {
        event?.preventDefault();

        router.get(
            index.url(),
            { type, from, to },
            {
                only: ONLY,
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    }

    function applyPreset(preset: 'today' | 'yesterday' | 'last7') {
        const end = filters.to;

        if (preset === 'today') {
            setFrom(end);
            setTo(end);
        } else if (preset === 'yesterday') {
            const day = addDays(end, -1);
            setFrom(day);
            setTo(day);
        } else {
            setFrom(addDays(end, -6));
            setTo(end);
        }
    }

    useEffect(() => {
        if (report) {
            setLoaded(report);
        } else if (loaded) {
            router.reload({
                only: ONLY,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [report]);

    const exportUrl = `/reports/export?${new URLSearchParams({ type: filters.type, from: filters.from, to: filters.to })}`;
    const rangeLabel =
        filters.from === filters.to ? formatDay(filters.from) : `${formatDay(filters.from)} – ${formatDay(filters.to)}`;

    return (
        <>
            <Head title="Reports" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
                        <p className="text-muted-foreground text-sm">Sales for any date range, on screen or as a CSV for your spreadsheet.</p>
                    </div>

                    <Can permission="report.export">
                        {data ? (
                            <Button variant="outline" asChild>
                                <a href={exportUrl} download>
                                    Export CSV
                                </a>
                            </Button>
                        ) : (
                            <Button variant="outline" disabled title="Run a report first">
                                Export CSV
                            </Button>
                        )}
                    </Can>
                </div>

                <form onSubmit={runReport} className="space-y-3">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="report-type">Report</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger id="report-type" className="w-56">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {types.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="report-from">From</Label>
                            <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="report-to">To</Label>
                            <Input id="report-to" type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} />
                        </div>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Running…' : 'Run report'}
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => applyPreset('today')}>
                            Today
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => applyPreset('yesterday')}>
                            Yesterday
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => applyPreset('last7')}>
                            Last 7 days
                        </Button>
                    </div>
                </form>

                <section className="space-y-2">
                    <div>
                        <h2 className="font-semibold">{data?.title ?? selectedLabel}</h2>
                        {data && <p className="text-muted-foreground text-sm">{rangeLabel}</p>}
                    </div>

                    {!data ? (
                        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-sm">
                            <p>Choose a report and date range, then run the report to see results.</p>
                            <Button onClick={() => runReport()} disabled={loading}>
                                {loading ? 'Running…' : 'Run report'}
                            </Button>
                        </div>
                    ) : data.rows.length === 0 ? (
                        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">No sales in this range.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="text-muted-foreground bg-muted/40 text-left">
                                    <tr>
                                        {data.columns.map((c) => (
                                            <th key={c.key} className={`px-3 py-2 font-medium ${c.type === 'text' ? '' : 'text-right'}`}>
                                                {c.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.rows.map((row, i) => (
                                        <tr key={i}>
                                            {data.columns.map((c) => (
                                                <td key={c.key} className={`px-3 py-2 ${c.type === 'text' ? '' : 'text-right tabular-nums'}`}>
                                                    {cell(c.type, row[c.key])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                                {data.totals && (
                                    <tfoot className="bg-muted/40 border-t font-semibold">
                                        <tr>
                                            {data.columns.map((c, i) => (
                                                <td key={c.key} className={`px-3 py-2 ${c.type === 'text' ? '' : 'text-right tabular-nums'}`}>
                                                    {data.totals && c.key in data.totals ? cell(c.type, data.totals[c.key]) : i === 0 ? 'Total' : ''}
                                                </td>
                                            ))}
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Reports', href: index() }],
};
