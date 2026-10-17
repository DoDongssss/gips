import { Head, Link, router } from '@inertiajs/react';

import { Can } from '@/components/can';
import { Pager } from '@/components/inventory/pager';
import { PoStatusBadge } from '@/components/inventory/status-badges';
import { Button } from '@/components/ui/button';
import { cleanQuery, poStatusLabels } from '@/lib/inventory';
import { formatPeso } from '@/lib/money';
import { create, index, show } from '@/routes/inventory/purchase-orders';
import { create as receive } from '@/routes/inventory/receipts';
import type { Paginated } from '@/types/menu';
import type { PoStatus, PurchaseOrderRow } from '@/types/inventory';

type Props = {
    orders: Paginated<PurchaseOrderRow>;
    statuses: PoStatus[];
    filters: { status: PoStatus | null; supplier: number | null };
};

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

export default function PurchaseOrdersIndex({ orders, statuses, filters }: Props) {
    function setStatus(status: PoStatus | null) {
        router.get(index.url(), cleanQuery({ status, supplier: filters.supplier }), { preserveState: true, replace: true });
    }

    return (
        <>
            <Head title="Purchase orders" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Purchase orders</h1>
                        <p className="text-muted-foreground text-sm">{orders.total} total</p>
                    </div>
                    <Button asChild>
                        <Link href={create.url()}>New purchase order</Link>
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant={filters.status === null ? 'default' : 'outline'} onClick={() => setStatus(null)}>
                        All
                    </Button>
                    {statuses.map((status) => (
                        <Button key={status} size="sm" variant={filters.status === status ? 'default' : 'outline'} onClick={() => setStatus(status)}>
                            {poStatusLabels[status]}
                        </Button>
                    ))}
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="text-muted-foreground border-b text-left">
                            <tr>
                                <th className="p-3 font-medium">PO</th>
                                <th className="p-3 font-medium">Supplier</th>
                                <th className="p-3 font-medium">Status</th>
                                <th className="p-3 font-medium">Ordered</th>
                                <th className="p-3 font-medium">Expected</th>
                                <th className="p-3 text-right font-medium">Items</th>
                                <th className="p-3 text-right font-medium">Total</th>
                                <th className="w-44 p-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {orders.data.map((order) => (
                                <tr key={order.id} className="border-b last:border-0">
                                    <td className="p-3 font-medium">{order.po_number}</td>
                                    <td className="p-3">{order.supplier.name}</td>
                                    <td className="p-3">
                                        <PoStatusBadge status={order.status} />
                                    </td>
                                    <td className="text-muted-foreground p-3" suppressHydrationWarning>
                                        {formatDate(order.ordered_at)}
                                    </td>
                                    <td className="text-muted-foreground p-3" suppressHydrationWarning>
                                        {formatDate(order.expected_at)}
                                    </td>
                                    <td className="p-3 text-right tabular-nums">{order.items_count ?? 0}</td>
                                    <td className="p-3 text-right tabular-nums">{formatPeso(order.total_cents)}</td>
                                    <td className="p-3">
                                        <div className="flex justify-end gap-2">
                                            {order.can_receive && (
                                                <Can permission="inventory.receive">
                                                    <Button size="sm" variant="outline" asChild>
                                                        <Link href={receive.url({ query: { purchase_order: order.id } })}>Receive</Link>
                                                    </Button>
                                                </Can>
                                            )}
                                            <Button size="sm" variant="outline" asChild>
                                                <Link href={show.url(order.id)}>Open</Link>
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {orders.data.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-muted-foreground p-8 text-center">
                                        No purchase orders.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pager currentPage={orders.current_page} lastPage={orders.last_page} prevUrl={orders.prev_page_url} nextUrl={orders.next_page_url} />
            </div>
        </>
    );
}

PurchaseOrdersIndex.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: '/inventory/ingredients' },
        { title: 'Purchase orders', href: index() },
    ],
};
