import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

import { Can } from '@/components/can';
import { Pager } from '@/components/inventory/pager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cleanQuery, formatQty, wasteReasonLabels } from '@/lib/inventory';
import WasteDialog from '@/pages/inventory/waste/waste-dialog';
import { index } from '@/routes/inventory/waste';
import type { Paginated } from '@/types/menu';
import type { WasteRow } from '@/types/inventory';

type Props = {
    logs: Paginated<WasteRow>;
    reasons: string[];
    filters: { ingredient: number | null; reason: string | null };
};

const ALL = 'all';

const formatWhen = (value: string | null) =>
    value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export default function WasteIndex({ logs, reasons, filters }: Props) {
    const [open, setOpen] = useState(false);

    function setReason(reason: string | null) {
        router.get(index.url(), cleanQuery({ ingredient: filters.ingredient, reason }), { preserveState: true, replace: true });
    }

    return (
        <>
            <Head title="Waste" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Waste log</h1>
                        <p className="text-muted-foreground text-sm">{logs.total} entries</p>
                    </div>
                    <Can permission="inventory.adjust">
                        <Button onClick={() => setOpen(true)}>Log waste</Button>
                    </Can>
                </div>

                <Select value={filters.reason ?? ALL} onValueChange={(value) => setReason(value === ALL ? null : value)}>
                    <SelectTrigger className="w-48" aria-label="Reason">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>All reasons</SelectItem>
                        {reasons.map((reason) => (
                            <SelectItem key={reason} value={reason}>
                                {wasteReasonLabels[reason] ?? reason}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="text-muted-foreground border-b text-left">
                            <tr>
                                <th className="p-3 font-medium">When</th>
                                <th className="p-3 font-medium">Ingredient</th>
                                <th className="p-3 text-right font-medium">Quantity</th>
                                <th className="p-3 font-medium">Reason</th>
                                <th className="p-3 font-medium">By</th>
                                <th className="p-3 font-medium">Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.data.map((log) => (
                                <tr key={log.id} className="border-b last:border-0">
                                    <td className="text-muted-foreground p-3 whitespace-nowrap" suppressHydrationWarning>
                                        {formatWhen(log.created_at)}
                                    </td>
                                    <td className="p-3 font-medium">{log.ingredient}</td>
                                    <td className="p-3 text-right tabular-nums">
                                        {formatQty(log.quantity)} {log.unit}
                                    </td>
                                    <td className="p-3">
                                        <Badge variant="secondary">{wasteReasonLabels[log.reason] ?? log.reason}</Badge>
                                    </td>
                                    <td className="p-3">{log.user}</td>
                                    <td className="text-muted-foreground p-3">{log.notes ?? '—'}</td>
                                </tr>
                            ))}
                            {logs.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-muted-foreground p-8 text-center">
                                        No waste logged.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pager currentPage={logs.current_page} lastPage={logs.last_page} prevUrl={logs.prev_page_url} nextUrl={logs.next_page_url} />
            </div>

            <WasteDialog open={open} onOpenChange={setOpen} />
        </>
    );
}

WasteIndex.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: '/inventory/ingredients' },
        { title: 'Waste', href: index() },
    ],
};
