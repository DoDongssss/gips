import type { ColumnDef } from '@tanstack/react-table';

import { Can } from '@/components/can';
import type { DataTableFeatures } from '@/components/data-table';
import { SortableHeader } from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { UserRecord } from '@/pages/users/form-dialog';

type ColumnOptions = {
    onEdit: (user: UserRecord) => void;
};

// Column widths. Name and Email take the remaining space; the rest are fixed.
export const columnClassNames: Record<string, string> = {
    name: 'w-[24%]',
    email: 'w-[32%]',
    role: 'w-36',
    is_active: 'w-32',
    has_pin: 'w-28',
    actions: 'w-24 text-right',
};

export function getColumns({ onEdit }: ColumnOptions): ColumnDef<DataTableFeatures, UserRecord>[] {
    return [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <SortableHeader title="Name" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        },
        {
            accessorKey: 'email',
            header: ({ column }) => (
                <SortableHeader title="Email" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
        },
        {
            accessorKey: 'role',
            header: ({ column }) => (
                <SortableHeader title="Role" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <span className="capitalize">{row.original.role ?? 'None'}</span>,
        },
        {
            accessorKey: 'is_active',
            header: ({ column }) => (
                <SortableHeader title="Status" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => (
                <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
                    {row.original.is_active ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
        {
            accessorKey: 'has_pin',
            header: 'PIN',
            enableSorting: false,
            cell: ({ row }) => (row.original.has_pin ? 'Set' : 'Not set'),
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            cell: ({ row }) => (
                <Can permission="user.update">
                    <Button variant="outline" size="sm" onClick={() => onEdit(row.original)}>
                        Edit
                    </Button>
                </Can>
            ),
        },
    ];
}