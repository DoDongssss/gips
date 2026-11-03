import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';

import { Can } from '@/components/can';
import type { DataTableFeatures } from '@/components/data-table';
import { PoStatusBadge } from '@/components/inventory/status-badges';
import { SortableHeader } from '@/components/sortable-header';
import { Button } from '@/components/ui/button';
import { formatPeso } from '@/lib/money';
import { show } from '@/routes/inventory/purchase-orders';
import { create as receive } from '@/routes/inventory/receipts';
import type { PurchaseOrderRow } from '@/types/inventory';

// Column widths. Supplier takes the remaining space; the rest are fixed.
export const columnClassNames: Record<string, string> = {
    po_number: 'w-36',
    supplier: 'w-[24%]',
    status: 'w-32',
    ordered_at: 'w-36',
    expected_at: 'w-36',
    items_count: 'w-24 text-right',
    total_cents: 'w-36 text-right',
    actions: 'w-48 text-right',
};

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

export function getColumns(): ColumnDef<DataTableFeatures, PurchaseOrderRow>[] {
    return [
        {
            accessorKey: 'po_number',
            header: ({ column }) => <SortableHeader title="PO" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="font-medium">{row.original.po_number}</span>,
        },
        {
            id: 'supplier',
            accessorFn: (row) => row.supplier.name ?? '',
            header: ({ column }) => <SortableHeader title="Supplier" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => row.original.supplier.name,
        },
        {
            accessorKey: 'status',
            header: ({ column }) => <SortableHeader title="Status" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <PoStatusBadge status={row.original.status} />,
        },
        {
            accessorKey: 'ordered_at',
            header: ({ column }) => <SortableHeader title="Ordered" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="text-muted-foreground" suppressHydrationWarning>
                    {formatDate(row.original.ordered_at)}
                </span>
            ),
        },
        {
            accessorKey: 'expected_at',
            header: ({ column }) => <SortableHeader title="Expected" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="text-muted-foreground" suppressHydrationWarning>
                    {formatDate(row.original.expected_at)}
                </span>
            ),
        },
        {
            accessorKey: 'items_count',
            header: ({ column }) => <SortableHeader title="Items" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="tabular-nums">{row.original.items_count ?? 0}</span>,
        },
        {
            accessorKey: 'total_cents',
            header: ({ column }) => <SortableHeader title="Total" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="tabular-nums">{formatPeso(row.original.total_cents)}</span>,
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    {row.original.can_receive && (
                        <Can permission="inventory.receive">
                            <Button size="sm" variant="outline" asChild>
                                <Link href={receive.url({ query: { purchase_order: row.original.id } })}>Receive</Link>
                            </Button>
                        </Can>
                    )}
                    <Button size="sm" variant="outline" asChild>
                        <Link href={show.url(row.original.id)}>Open</Link>
                    </Button>
                </div>
            ),
        },
    ];
}