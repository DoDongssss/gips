import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';

import type { DataTableFeatures } from '@/components/shared/data-table';
import { SortableHeader } from '@/components/shared/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPeso } from '@/lib/money';
import { ChannelBadge, OrderStatusBadge, orderTypeLabel, PaymentStatusBadge } from '@/pages/orders/status-badges';
import type { OrderRow } from '@/types/orders';
import { show } from '@/routes/orders';

export const columnClassNames: Record<string, string> = {
    order_number: 'w-28',
    channel: 'w-24',
    type: 'w-28',
    status: 'w-32',
    payment_status: 'w-32',
    customer_name: 'w-[14%]',
    total_cents: 'w-32 text-right',
    paid: 'w-32 text-right',
    cashier: 'w-32',
    created_at: 'w-36',
    actions: 'w-24 text-right',
};

const formatTime = (value: string | null): string =>
    value ? new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—';

type ColumnOptions = {
    highlightId?: number | null;
};

export function getColumns(options: ColumnOptions = {}): ColumnDef<DataTableFeatures, OrderRow>[] {
    const highlightId = options.highlightId ?? null;

    return [
        {
            accessorKey: 'order_number',
            header: ({ column }) => (
                <SortableHeader title="Order" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => {
                const order = row.original;
                const highlighted = highlightId === order.id;

                return (
                    <div className={highlighted ? 'rounded-md bg-amber-100/80 px-1 dark:bg-amber-950/40' : undefined}>
                        <Link href={show.url(order.id)} className="font-medium hover:underline">
                            {order.order_number}
                        </Link>
                        {order.channel === 'kiosk' && order.requires_verification && (
                            <Badge variant="outline" className="ml-1 text-xs">
                                ID
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'channel',
            header: 'Channel',
            enableSorting: false,
            cell: ({ row }) => <ChannelBadge channel={row.original.channel} />,
        },
        {
            accessorKey: 'type',
            header: 'Type',
            enableSorting: false,
            cell: ({ row }) => orderTypeLabel[row.original.type] ?? row.original.type,
        },
        {
            accessorKey: 'status',
            header: ({ column }) => (
                <SortableHeader title="Status" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
        },
        {
            accessorKey: 'payment_status',
            header: ({ column }) => (
                <SortableHeader title="Payment" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => (
                <PaymentStatusBadge
                    status={row.original.payment_status}
                />
            ),
        },
        {
            accessorKey: 'customer_name',
            header: 'Customer',
            enableSorting: false,
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.customer_name ?? '—'}</span>,
        },
        {
            accessorKey: 'total_cents',
            header: ({ column }) => (
                <SortableHeader title="Total" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <span className="font-medium">{formatPeso(row.original.total_cents)}</span>,
        },
        {
            id: 'paid',
            header: 'Paid',
            enableSorting: false,
            cell: ({ row }) => {
                const order = row.original;

                return (
                    <span className={order.payment_status === 'partial' ? 'font-medium text-amber-700 dark:text-amber-300' : ''}>
                        {formatPeso(order.paid_cents)}
                    </span>
                );
            },
        },
        {
            accessorKey: 'cashier',
            header: 'Cashier',
            enableSorting: false,
            cell: ({ row }) => row.original.cashier ?? '—',
        },
        {
            accessorKey: 'created_at',
            header: ({ column }) => (
                <SortableHeader title="Time" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <span suppressHydrationWarning>{formatTime(row.original.created_at)}</span>,
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={show.url(row.original.id)}>View</Link>
                    </Button>
                </div>
            ),
        },
    ];
}
