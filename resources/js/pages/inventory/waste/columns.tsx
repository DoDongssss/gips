import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';

import type { DataTableFeatures } from '@/components/data-table';
import { SortableHeader } from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { formatQty, wasteReasonLabels } from '@/lib/inventory';
import { index } from '@/routes/inventory/waste';
import type { WasteRow } from '@/types/inventory';

type ColumnOptions = {
    /** true when the page is already showing one ingredient: its name is then plain text, not a link. */
    filteredByIngredient: boolean;
};

export const columnClassNames: Record<string, string> = {
    created_at: 'w-40',
    ingredient: 'w-[22%]',
    quantity: 'w-36 text-right',
    reason: 'w-36',
    user: 'w-32',
    notes: 'w-[24%]',
};

const formatWhen = (value: string | null) =>
    value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export function getColumns({ filteredByIngredient }: ColumnOptions): ColumnDef<DataTableFeatures, WasteRow>[] {
    return [
        {
            accessorKey: 'created_at',
            header: ({ column }) => <SortableHeader title="When" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="text-muted-foreground whitespace-nowrap" suppressHydrationWarning>
                    {formatWhen(row.original.created_at)}
                </span>
            ),
        },
        {
            id: 'ingredient',
            accessorFn: (row) => row.ingredient.name,
            header: ({ column }) => <SortableHeader title="Ingredient" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) =>
                filteredByIngredient ? (
                    <span className="font-medium">{row.original.ingredient.name}</span>
                ) : (
                    <Link href={index.url({ query: { ingredient: row.original.ingredient.id } })} className="font-medium hover:underline">
                        {row.original.ingredient.name}
                    </Link>
                ),
        },
        {
            accessorKey: 'quantity',
            header: ({ column }) => <SortableHeader title="Quantity" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="font-medium tabular-nums">
                    {formatQty(row.original.quantity)} {row.original.unit}
                </span>
            ),
        },
        {
            accessorKey: 'reason',
            header: ({ column }) => <SortableHeader title="Reason" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <Badge variant="secondary">{wasteReasonLabels[row.original.reason] ?? row.original.reason}</Badge>,
        },
        {
            accessorKey: 'user',
            header: ({ column }) => <SortableHeader title="By" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => row.original.user,
        },
        {
            accessorKey: 'notes',
            header: 'Note',
            enableSorting: false,
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.notes ?? '—'}</span>,
        },
    ];
}
