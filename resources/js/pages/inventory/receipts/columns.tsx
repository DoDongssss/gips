import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';

import type { DataTableFeatures } from '@/components/shared/data-table';
import { SortableHeader } from '@/components/shared/sortable-header';
import { Button } from '@/components/ui/button';
import { show as showPo } from '@/routes/inventory/purchase-orders';
import { index, show } from '@/routes/inventory/receipts';
import type { ReceiptRow } from '@/types/inventory';

type ColumnOptions = {
    /** true when the page is already filtered to one supplier: name is plain text, not a link. */
    filteredBySupplier: boolean;
};

export const columnClassNames: Record<string, string> = {
    receipt_number: 'w-36',
    supplier: 'w-[22%]',
    po_number: 'w-32',
    invoice_no: 'w-36',
    items_count: 'w-24 text-right',
    received_at: 'w-40',
    received_by: 'w-32',
    actions: 'w-24 text-right',
};

const formatWhen = (value: string | null) =>
    value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export function getColumns({ filteredBySupplier }: ColumnOptions): ColumnDef<DataTableFeatures, ReceiptRow>[] {
    return [
        {
            accessorKey: 'receipt_number',
            header: ({ column }) => <SortableHeader title="Receipt" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="font-medium">{row.original.receipt_number}</span>,
        },
        {
            id: 'supplier',
            accessorFn: (row) => row.supplier.name,
            header: ({ column }) => <SortableHeader title="Supplier" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) =>
                filteredBySupplier ? (
                    <span>{row.original.supplier.name}</span>
                ) : (
                    <Link href={index.url({ query: { supplier: row.original.supplier.id } })} className="hover:underline">
                        {row.original.supplier.name}
                    </Link>
                ),
        },
        {
            id: 'po_number',
            accessorFn: (row) => row.po_number ?? '',
            header: ({ column }) => <SortableHeader title="PO" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) =>
                row.original.po_number && row.original.purchase_order_id ? (
                    <Link href={showPo.url(row.original.purchase_order_id)} className="text-muted-foreground hover:underline">
                        {row.original.po_number}
                    </Link>
                ) : (
                    <span className="text-muted-foreground">No PO</span>
                ),
        },
        {
            accessorKey: 'invoice_no',
            header: ({ column }) => <SortableHeader title="Invoice" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.invoice_no ?? '—'}</span>,
        },
        {
            accessorKey: 'items_count',
            header: ({ column }) => <SortableHeader title="Lines" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="tabular-nums">{row.original.items_count}</span>,
        },
        {
            accessorKey: 'received_at',
            header: ({ column }) => <SortableHeader title="Received" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="text-muted-foreground whitespace-nowrap" suppressHydrationWarning>
                    {formatWhen(row.original.received_at)}
                </span>
            ),
        },
        {
            id: 'received_by',
            accessorFn: (row) => row.received_by ?? '',
            header: ({ column }) => <SortableHeader title="By" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => row.original.received_by ?? '—',
        },
        {
            id: 'actions',
            header: '',
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
