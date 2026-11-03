import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';

import { Can } from '@/components/can';
import type { DataTableFeatures } from '@/components/data-table';
import { StockFlag } from '@/components/inventory/status-badges';
import { SortableHeader } from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatQty, formatUnitCost } from '@/lib/inventory';
import { index as movements } from '@/routes/inventory/movements';
import type { IngredientRow } from '@/types/inventory';

type ColumnOptions = {
    onEdit: (ingredient: IngredientRow) => void;
    onAdjust: (ingredient: IngredientRow) => void;
    onWaste: (ingredient: IngredientRow) => void;
};

// Column widths. Name takes the remaining space; the rest are fixed.
export const columnClassNames: Record<string, string> = {
    name: 'w-[24%]',
    category: 'w-36',
    quantity: 'w-40 text-right',
    reorder_level: 'w-32 text-right',
    average_cost_cents: 'w-40 text-right',
    is_active: 'w-28',
    actions: 'w-72 text-right',
};

export function getColumns({ onEdit, onAdjust, onWaste }: ColumnOptions): ColumnDef<DataTableFeatures, IngredientRow>[] {
    return [
        {
            accessorKey: 'name',
            header: ({ column }) => <SortableHeader title="Ingredient" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <div>
                    <span className="font-medium">{row.original.name}</span>
                    {row.original.sku && <span className="text-muted-foreground ml-2 text-xs">{row.original.sku}</span>}
                </div>
            ),
        },
        {
            id: 'category',
            accessorFn: (row) => row.category?.name ?? '',
            header: ({ column }) => <SortableHeader title="Category" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.category?.name ?? '—'}</span>,
        },
        {
            id: 'quantity',
            accessorFn: (row) => Number(row.quantity),
            header: ({ column }) => <SortableHeader title="On hand" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <div className="flex items-center justify-end gap-2">
                    <StockFlag negative={row.original.is_negative} low={row.original.is_low} />
                    <span className="tabular-nums">
                        {formatQty(row.original.quantity)} {row.original.base_unit.abbreviation}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: 'reorder_level',
            header: ({ column }) => <SortableHeader title="Reorder at" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="text-muted-foreground tabular-nums">
                    {Number(row.original.reorder_level) > 0 ? `${formatQty(row.original.reorder_level)} ${row.original.base_unit.abbreviation}` : '—'}
                </span>
            ),
        },
        {
            accessorKey: 'average_cost_cents',
            header: ({ column }) => <SortableHeader title="Avg cost" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="text-muted-foreground tabular-nums">{formatUnitCost(row.original.average_cost_cents, row.original.base_unit.abbreviation)}</span>
            ),
        },
        {
            accessorKey: 'is_active',
            header: ({ column }) => <SortableHeader title="Status" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <Badge variant={row.original.is_active ? 'default' : 'secondary'}>{row.original.is_active ? 'Active' : 'Inactive'}</Badge>,
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={movements.url({ query: { ingredient: row.original.id } })}>History</Link>
                    </Button>
                    <Can permission="inventory.adjust">
                        <Button variant="outline" size="sm" onClick={() => onWaste(row.original)}>
                            Waste
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onAdjust(row.original)}>
                            Adjust
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onEdit(row.original)}>
                            Edit
                        </Button>
                    </Can>
                </div>
            ),
        },
    ];
}