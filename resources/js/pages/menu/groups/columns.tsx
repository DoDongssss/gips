import type { ColumnDef } from '@tanstack/react-table';

import { AvailabilitySwitch } from '@/components/availability-switch';
import { Can } from '@/components/can';
import type { DataTableFeatures } from '@/components/data-table';
import { SortableHeader } from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDelta } from '@/lib/money';
import type { GroupRecord } from '@/pages/menu/groups/form-dialog';
import { availability } from '@/routes/menu/modifiers';

type ColumnOptions = {
    onEdit: (group: GroupRecord) => void;
    onDelete: (group: GroupRecord) => void;
};

// Column widths. Options takes the remaining space; the rest are fixed.
export const columnClassNames: Record<string, string> = {
    name: 'w-[20%]',
    selection_type: 'w-48',
    modifiers: 'w-[36%]',
    products_count: 'w-28',
    is_active: 'w-28',
    actions: 'w-44 text-right',
};

export function getColumns({ onEdit, onDelete }: ColumnOptions): ColumnDef<DataTableFeatures, GroupRecord>[] {
    return [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <SortableHeader title="Group" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        },
        {
            accessorKey: 'selection_type',
            header: ({ column }) => (
                <SortableHeader title="Rule" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => {
                const group = row.original;

                return (
                    <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">{group.selection_type === 'single' ? 'Pick one' : 'Pick several'}</Badge>
                        {group.is_required && <Badge>Required</Badge>}
                        {group.selection_type === 'multiple' && (
                            <Badge variant="outline">
                                {group.min_select}–{group.max_select ?? 'any'} choices
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'modifiers',
            header: 'Options',
            enableSorting: false,
            cell: ({ row }) => (
                <ul className="space-y-1">
                    {row.original.modifiers.map((modifier) => (
                        <li key={modifier.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate">
                                <span className={modifier.is_available ? '' : 'text-muted-foreground line-through'}>{modifier.name}</span>
                                {modifier.is_default && (
                                    <Badge variant="outline" className="ml-2">
                                        Default
                                    </Badge>
                                )}
                                <span className="text-muted-foreground ml-2 text-xs">{formatDelta(modifier.price_delta_cents)}</span>
                            </span>
                            <Can permission="menu.availability">
                                <AvailabilitySwitch url={availability.url(modifier.id)} available={modifier.is_available} label={modifier.name} />
                            </Can>
                        </li>
                    ))}
                </ul>
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
                <Badge variant={row.original.is_active ? 'default' : 'secondary'}>{row.original.is_active ? 'Visible' : 'Hidden'}</Badge>
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