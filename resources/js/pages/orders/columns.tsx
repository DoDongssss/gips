import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';

import type { DataTableFeatures } from '@/components/data-table';
import { SortableHeader } from '@/components/sortable-header';
import { Button } from '@/components/ui/button';
import { formatPeso } from '@/lib/money';
import { OrderStatusBadge, orderTypeLabel, PaymentStatusBadge } from '@/pages/orders/status-badges';
import type { OrderRow } from '@/pages/orders/types';
import { show } from '@/routes/orders';

// Column widths. Customer takes the remaining space; the rest are fixed.
export const columnClassNames: Record<string, string> = {
    order_number: 'w-28',
    type: 'w-28',
    status: 'w-32',
    payment_status: 'w-32',
    customer_name: 'w-[18%]',
    total_cents: 'w-32 text-right',
    paid: 'w-32 text-right',
    cashier: 'w-36',
    created_at: 'w-40',
    actions: 'w-24 text-right',
};

const formatTime = (value: string | null): string =>
    value ? new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—';

export function getColumns(): ColumnDef<DataTableFeatures, OrderRow>[] {
    return [
        {
            accessorKey: 'order_number',
            header: ({ column }) => (
                <SortableHeader title="Order" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <span className="font-medium">{row.original.order_number}</span>,
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
            cell: ({ row }) => <PaymentStatusBadge status={row.original.payment_status} />,
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
            cell: ({ row }) => formatPeso(row.original.paid_cents),
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
