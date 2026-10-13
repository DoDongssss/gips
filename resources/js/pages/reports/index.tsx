import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/can';
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
    report: ReportTable;
};

function cell(type: 'text' | 'int' | 'money', value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    if (type === 'money') {
        return formatPeso(Number(value));
    }

    return type === 'int' ? Number(value).toLocaleString() : String(value);
}

export default function Index({ filters, types, report }: Props) {
    const [type, setType] = useState(filters.type);
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);

    function run(event?: FormEvent) {
        event?.preventDefault();

        router.get(index.url(), { type, from, to }, { preserveState: true, preserveScroll: true, replace: true, only: ['report', 'filters'] });
    }

    // Plain URL: the CSV is a download, not an Inertia visit.
    const exportUrl = `/reports/export?${new URLSearchParams({ type: filters.type, from: filters.from, to: filters.to })}`;

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
                        <Button variant="outline" asChild>
                            <a href={exportUrl} download>
                                Export CSV
                            </a>
                        </Button>
                    </Can>
                </div>

                <form onSubmit={run} className="flex flex-wrap items-end gap-3">
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
                    <Button type="submit">Run report</Button>
                </form>

                <section className="space-y-2">
                    <h2 className="font-semibold">{report.title}</h2>

                    {report.rows.length === 0 ? (
                        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">No sales in this range.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="text-muted-foreground bg-muted/40 text-left">
                                    <tr>
                                        {report.columns.map((c) => (
                                            <th key={c.key} className={`px-3 py-2 font-medium ${c.type === 'text' ? '' : 'text-right'}`}>
                                                {c.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {report.rows.map((row, i) => (
                                        <tr key={i}>
                                            {report.columns.map((c) => (
                                                <td key={c.key} className={`px-3 py-2 ${c.type === 'text' ? '' : 'text-right tabular-nums'}`}>
                                                    {cell(c.type, row[c.key])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                                {report.totals && (
                                    <tfoot className="bg-muted/40 border-t font-semibold">
                                        <tr>
                                            {report.columns.map((c, i) => (
                                                <td key={c.key} className={`px-3 py-2 ${c.type === 'text' ? '' : 'text-right tabular-nums'}`}>
                                                    {report.totals && c.key in report.totals ? cell(c.type, report.totals[c.key]) : i === 0 ? 'Total' : ''}
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
