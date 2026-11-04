import type { ColumnDef } from '@tanstack/react-table';

import { Can } from '@/components/shared/can';
import type { DataTableFeatures } from '@/components/shared/data-table';
import { SortableHeader } from '@/components/shared/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Unit, UnitType } from '@/types/inventory';

type ColumnOptions = {
    onEdit: (unit: Unit) => void;
    onDelete: (unit: Unit) => void;
};

const typeLabels: Record<UnitType, string> = { weight: 'Weight', volume: 'Volume', count: 'Count' };

export const columnClassNames: Record<string, string> = {
    name: 'w-[30%]',
    abbreviation: 'w-36',
    type: 'w-36',
    actions: 'w-40 text-right',
};

export function getColumns({ onEdit, onDelete }: ColumnOptions): ColumnDef<DataTableFeatures, Unit>[] {
    return [
        {
            accessorKey: 'name',
            header: ({ column }) => <SortableHeader title="Name" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        },
        {
            accessorKey: 'abbreviation',
            header: ({ column }) => <SortableHeader title="Abbreviation" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => row.original.abbreviation,
        },
        {
            accessorKey: 'type',
            header: ({ column }) => <SortableHeader title="Measures" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <Badge variant="secondary" className="capitalize">
                    {typeLabels[row.original.type]}
                </Badge>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            cell: ({ row }) => (
                <Can permission="inventory.adjust">
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => onEdit(row.original)}>
                            Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(row.original)}>
                            Delete
                        </Button>
                    </div>
                </Can>
            ),
        },
    ];
}
