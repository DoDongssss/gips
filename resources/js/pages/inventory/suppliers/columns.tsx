import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';

import type { DataTableFeatures } from '@/components/data-table';
import { SortableHeader } from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { show } from '@/routes/inventory/suppliers';
import type { Supplier } from '@/types/inventory';

type ColumnOptions = {
    onEdit: (supplier: Supplier) => void;
};

export const columnClassNames: Record<string, string> = {
    name: 'w-[24%]',
    contact_person: 'w-[18%]',
    phone: 'w-36',
    ingredients_count: 'w-32 text-right',
    is_active: 'w-28',
    actions: 'w-44 text-right',
};

export function getColumns({ onEdit }: ColumnOptions): ColumnDef<DataTableFeatures, Supplier>[] {
    return [
        {
            accessorKey: 'name',
            header: ({ column }) => <SortableHeader title="Supplier" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        },
        {
            accessorKey: 'contact_person',
            header: ({ column }) => <SortableHeader title="Contact" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.contact_person ?? '—'}</span>,
        },
        {
            accessorKey: 'phone',
            header: ({ column }) => <SortableHeader title="Phone" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.phone ?? '—'}</span>,
        },
        {
            accessorKey: 'ingredients_count',
            header: ({ column }) => <SortableHeader title="Ingredients" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="tabular-nums">{row.original.ingredients_count ?? 0}</span>,
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
                    <Button variant="outline" size="sm" onClick={() => onEdit(row.original)}>
                        Edit
                    </Button>
                    <Button size="sm" asChild>
                        <Link href={show.url(row.original.id)}>Prices</Link>
                    </Button>
                </div>
            ),
        },
    ];
}
