import type { ColumnDef } from '@tanstack/react-table';

import { Can } from '@/components/shared/can';
import type { DataTableFeatures } from '@/components/shared/data-table';
import { SortableHeader } from '@/components/shared/sortable-header';
import { Button } from '@/components/ui/button';
import { formatQty } from '@/lib/inventory';
import type { Conversion } from '@/types/inventory';

type ColumnOptions = {
    onDelete: (conversion: Conversion) => void;
};

export const conversionColumnClassNames: Record<string, string> = {
    from: 'w-[32%]',
    factor: 'w-48',
    to: 'w-[32%]',
    actions: 'w-20 text-right',
};

export function getConversionColumns({ onDelete }: ColumnOptions): ColumnDef<DataTableFeatures, Conversion>[] {
    return [
        {
            id: 'from',
            accessorFn: (row) => row.from.name,
            header: ({ column }) => <SortableHeader title="From (1 of)" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span>
                    1 <strong>{row.original.from.name}</strong> <span className="text-muted-foreground">({row.original.from.abbreviation})</span>
                </span>
            ),
        },
        {
            accessorKey: 'factor',
            header: ({ column }) => <SortableHeader title="Equals" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="tabular-nums">{formatQty(row.original.factor)}</span>,
        },
        {
            id: 'to',
            accessorFn: (row) => row.to.name,
            header: ({ column }) => <SortableHeader title="To" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span>
                    <strong>{row.original.to.name}</strong> <span className="text-muted-foreground">({row.original.to.abbreviation})</span>
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            enableSorting: false,
            cell: ({ row }) => (
                <Can permission="inventory.adjust">
                    <div className="flex justify-end">
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(row.original)}>
                            Remove
                        </Button>
                    </div>
                </Can>
            ),
        },
    ];
}
