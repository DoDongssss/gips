import type { ColumnDef } from '@tanstack/react-table';

import { Can } from '@/components/can';
import type { DataTableFeatures } from '@/components/data-table';
import { SortableHeader } from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CategoryRecord } from '@/pages/menu/categories/form_dialog';

type ColumnOptions = {
    onEdit: (category: CategoryRecord) => void;
    onDelete: (category: CategoryRecord) => void;
};

// Column widths. Name and Description take the remaining space; the rest are fixed.
export const columnClassNames: Record<string, string> = {
    name: 'w-[28%]',
    description: 'w-[34%]',
    products_count: 'w-32',
    is_active: 'w-32',
    actions: 'w-44 text-right',
};

export function getColumns({ onEdit, onDelete }: ColumnOptions): ColumnDef<DataTableFeatures, CategoryRecord>[] {
    return [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <SortableHeader title="Name" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        },
        {
            accessorKey: 'description',
            header: 'Description',
            enableSorting: false,
            cell: ({ row }) => (
                <span className="text-muted-foreground line-clamp-1">{row.original.description ?? '—'}</span>
            ),
        },
        {
            accessorKey: 'products_count',
            header: ({ column }) => (
                <SortableHeader title="Products" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => row.original.products_count,
        },
        {
            accessorKey: 'is_active',
            header: ({ column }) => (
                <SortableHeader title="Status" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => (
                <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
                    {row.original.is_active ? 'Visible' : 'Hidden'}
                </Badge>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    <Can permission="menu.update">
                        <Button variant="outline" size="sm" onClick={() => onEdit(row.original)}>
                            Edit
                        </Button>
                    </Can>
                    <Can permission="menu.delete">
                        <Button variant="outline" size="sm" className="text-destructive" onClick={() => onDelete(row.original)}>
                            Delete
                        </Button>
                    </Can>
                </div>
            ),
        },
    ];
}