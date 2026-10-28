import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';

import type { DataTableFeatures } from '@/components/data-table';
import { SortableHeader } from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { formatChange, formatUnitCost, movementLabels, referenceLabel } from '@/lib/inventory';
import { index } from '@/routes/inventory/movements';
import type { MovementRow } from '@/types/inventory';

type ColumnOptions = {
    /** true when the page is already showing one ingredient: its name is then plain text, not a link. */
    filteredByIngredient: boolean;
};

// Column widths. Ingredient and Note take the remaining space; the rest are fixed.
export const columnClassNames: Record<string, string> = {
    created_at: 'w-40',
    ingredient: 'w-[22%]',
    type: 'w-36',
    quantity_change: 'w-36 text-right',
    unit_cost_cents: 'w-36 text-right',
    reference: 'w-40',
    user: 'w-32',
    notes: 'w-[20%]',
};

const formatWhen = (value: string | null) =>
    value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export function getColumns({ filteredByIngredient }: ColumnOptions): ColumnDef<DataTableFeatures, MovementRow>[] {
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
            accessorKey: 'type',
            header: ({ column }) => <SortableHeader title="Type" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <Badge variant="outline">{movementLabels[row.original.type] ?? row.original.type}</Badge>,
        },
        {
            accessorKey: 'quantity_change',
            header: ({ column }) => <SortableHeader title="Change" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className={`font-medium tabular-nums ${Number(row.original.quantity_change) < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                    {formatChange(row.original.quantity_change)} {row.original.unit}
                </span>
            ),
        },
        {
            accessorKey: 'unit_cost_cents',
            header: ({ column }) => <SortableHeader title="Unit cost" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="text-muted-foreground tabular-nums">
                    {row.original.unit_cost_cents === null ? '—' : formatUnitCost(row.original.unit_cost_cents, row.original.unit)}
                </span>
            ),
        },
        {
            id: 'reference',
            header: 'Source',
            enableSorting: false,
            cell: ({ row }) => <span className="text-muted-foreground">{referenceLabel(row.original.reference_type, row.original.reference_id)}</span>,
        },
        {
            accessorKey: 'user',
            header: ({ column }) => <SortableHeader title="By" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => row.original.user ?? 'System',
        },
        {
            accessorKey: 'notes',
            header: 'Note',
            enableSorting: false,
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.notes ?? '—'}</span>,
        },
    ];
}