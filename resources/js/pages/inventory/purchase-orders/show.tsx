import { Head, Link, router } from '@inertiajs/react';
import { toast } from 'sonner';

import { Can } from '@/components/can';
import { PoStatusBadge } from '@/components/inventory/status-badges';
import { Button } from '@/components/ui/button';
import { formatQty } from '@/lib/inventory';
import { formatPeso } from '@/lib/money';
import { cancel, edit, index, send } from '@/routes/inventory/purchase-orders';
import { create as receive, show as showReceipt } from '@/routes/inventory/receipts';
import type { PurchaseOrderDetail } from '@/types/inventory';

type Props = { order: PurchaseOrderDetail };

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

export default function PurchaseOrderShow({ order }: Props) {
    const onError = (errors: Record<string, string>) => toast.error(Object.values(errors)[0] ?? 'That could not be done.');

    function markSent() {
        if (confirm(`Mark ${order.po_number} as sent to ${order.supplier.name}? It can no longer be edited.`)) {
            router.post(send.url(order.id), {}, { preserveScroll: true, onError });
        }
    }

    function cancelOrder() {
        if (confirm(`Cancel ${order.po_number}?`)) {
            router.post(cancel.url(order.id), {}, { preserveScroll: true, onError });
        }
    }

    return (
        <>
            <Head title={order.po_number} />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight">{order.po_number}</h1>
                            <PoStatusBadge status={order.status} />
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {order.supplier.name} · ordered {formatDate(order.ordered_at)} · expected {formatDate(order.expected_at)}
                            {order.created_by && ` · by ${order.created_by}`}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {order.can_edit && (
                            <Button variant="outline" asChild>
                                <Link href={edit.url(order.id)}>Edit</Link>
                            </Button>
                        )}
                        {order.can_send && <Button onClick={markSent}>Mark as sent</Button>}
                        {order.can_receive && (
                            <Can permission="inventory.receive">
                                <Button asChild>
                                    <Link href={receive.url({ query: { purchase_order: order.id } })}>Receive goods</Link>
                                </Button>
                            </Can>
                        )}
                        {order.can_cancel && (
                            <Button variant="ghost" className="text-destructive" onClick={cancelOrder}>
                                Cancel order
                            </Button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="text-muted-foreground border-b text-left">
                            <tr>
                                <th className="p-3 font-medium">Ingredient</th>
                                <th className="p-3 text-right font-medium">Ordered</th>
                                <th className="p-3 text-right font-medium">Received</th>
                                <th className="p-3 text-right font-medium">Outstanding</th>
                                <th className="p-3 text-right font-medium">Unit cost</th>
                                <th className="p-3 text-right font-medium">Line total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item) => (
                                <tr key={item.id} className="border-b last:border-0">
                                    <td className="p-3 font-medium">{item.ingredient}</td>
                                    <td className="p-3 text-right tabular-nums">
                                        {formatQty(item.quantity_ordered)} {item.unit}
                                    </td>
                                    <td className="p-3 text-right tabular-nums">
                                        {formatQty(item.quantity_received)} {item.unit}
                                    </td>
                                    <td className={`p-3 text-right tabular-nums ${Number(item.quantity_outstanding) > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                                        {formatQty(item.quantity_outstanding)} {item.unit}
                                    </td>
                                    <td className="p-3 text-right tabular-nums">{formatPeso(item.unit_cost_cents)}</td>
                                    <td className="p-3 text-right tabular-nums">{formatPeso(Math.round(Number(item.quantity_ordered) * item.unit_cost_cents))}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t font-semibold">
                                <td colSpan={5} className="p-3 text-right">
                                    Total
                                </td>
                                <td className="p-3 text-right tabular-nums">{formatPeso(order.total_cents)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {order.notes && (
                    <div className="rounded-lg border p-4 text-sm">
                        <p className="text-muted-foreground mb-1 text-xs">Notes</p>
                        {order.notes}
                    </div>
                )}

                <section className="space-y-2">
                    <h2 className="font-semibold">Deliveries received</h2>
                    {order.receipts.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Nothing received yet.</p>
                    ) : (
                        <ul className="divide-y rounded-lg border">
                            {order.receipts.map((receipt) => (
                                <li key={receipt.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                                    <span>
                                        <strong>{receipt.receipt_number}</strong>
                                        {receipt.invoice_no && ` · invoice ${receipt.invoice_no}`} · {formatDate(receipt.received_at)}
                                        {receipt.received_by && ` · ${receipt.received_by}`}
                                    </span>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={showReceipt.url(receipt.id)}>View</Link>
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </>
    );
}

PurchaseOrderShow.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: '/inventory/ingredients' },
        { title: 'Purchase orders', href: index() },
        { title: 'Purchase order', href: index() },
    ],
};
