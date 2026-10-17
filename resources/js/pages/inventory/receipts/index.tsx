import { Head, Link } from '@inertiajs/react';

import { Can } from '@/components/can';
import { Pager } from '@/components/inventory/pager';
import { Button } from '@/components/ui/button';
import { create, index, show } from '@/routes/inventory/receipts';
import type { Paginated } from '@/types/menu';
import type { ReceiptRow } from '@/types/inventory';

type Props = { receipts: Paginated<ReceiptRow> };

const formatWhen = (value: string | null) =>
    value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export default function ReceiptsIndex({ receipts }: Props) {
    return (
        <>
            <Head title="Receiving" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Goods receiving</h1>
                        <p className="text-muted-foreground text-sm">Deliveries that added stock. Receive against a purchase order, or record a delivery without one.</p>
                    </div>
                    <Can permission="inventory.receive">
                        <Button asChild>
                            <Link href={create.url()}>Receive a delivery</Link>
                        </Button>
                    </Can>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="text-muted-foreground border-b text-left">
                            <tr>
                                <th className="p-3 font-medium">Receipt</th>
                                <th className="p-3 font-medium">Supplier</th>
                                <th className="p-3 font-medium">PO</th>
                                <th className="p-3 font-medium">Invoice</th>
                                <th className="p-3 text-right font-medium">Lines</th>
                                <th className="p-3 font-medium">Received</th>
                                <th className="p-3 font-medium">By</th>
                                <th className="w-24 p-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {receipts.data.map((receipt) => (
                                <tr key={receipt.id} className="border-b last:border-0">
                                    <td className="p-3 font-medium">{receipt.receipt_number}</td>
                                    <td className="p-3">{receipt.supplier ?? '—'}</td>
                                    <td className="text-muted-foreground p-3">{receipt.po_number ?? 'No PO'}</td>
                                    <td className="text-muted-foreground p-3">{receipt.invoice_no ?? '—'}</td>
                                    <td className="p-3 text-right tabular-nums">{receipt.items_count}</td>
                                    <td className="text-muted-foreground p-3" suppressHydrationWarning>
                                        {formatWhen(receipt.received_at)}
                                    </td>
                                    <td className="p-3">{receipt.received_by ?? '—'}</td>
                                    <td className="p-3 text-right">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={show.url(receipt.id)}>View</Link>
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {receipts.data.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-muted-foreground p-8 text-center">
                                        No deliveries received yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pager currentPage={receipts.current_page} lastPage={receipts.last_page} prevUrl={receipts.prev_page_url} nextUrl={receipts.next_page_url} />
            </div>
        </>
    );
}

ReceiptsIndex.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: '/inventory/ingredients' },
        { title: 'Receiving', href: index() },
    ],
};
