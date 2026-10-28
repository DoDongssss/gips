import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';

import type { DataTableFeatures } from '@/components/data-table';
import { SortableHeader } from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { show } from '@/routes/inventory/counts';
import type { CountRow } from '@/types/inventory';

// Column widths. By takes the remaining space; the rest are fixed.
export const columnClassNames: Record<string, string> = {
    id: 'w-28',
    status: 'w-36',
    started_at: 'w-44',
    completed_at: 'w-44',
    started_by: 'w-[20%]',
    items_count: 'w-32 text-right',
    actions: 'w-28 text-right',
};

const formatWhen = (value: string | null) =>
    value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export function getColumns(): ColumnDef<DataTableFeatures, CountRow>[] {
    return [
        {
            accessorKey: 'id',
            header: ({ column }) => <SortableHeader title="Count" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="font-medium">#{row.original.id}</span>,
        },
        {
            accessorKey: 'status',
            header: ({ column }) => <SortableHeader title="Status" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <Badge variant={row.original.status === 'completed' ? 'default' : 'secondary'}>{row.original.status === 'completed' ? 'Completed' : 'In progress'}</Badge>
            ),
        },
        {
            accessorKey: 'started_at',
            header: ({ column }) => <SortableHeader title="Started" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="text-muted-foreground" suppressHydrationWarning>
                    {formatWhen(row.original.started_at)}
                </span>
            ),
        },
        {
            accessorKey: 'completed_at',
            header: ({ column }) => <SortableHeader title="Finished" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="text-muted-foreground" suppressHydrationWarning>
                    {formatWhen(row.original.completed_at)}
                </span>
            ),
        },
        {
            accessorKey: 'started_by',
            header: ({ column }) => <SortableHeader title="By" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => row.original.started_by ?? '—',
        },
        {
            accessorKey: 'items_count',
            header: ({ column }) => <SortableHeader title="Ingredients" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="tabular-nums">{row.original.items_count}</span>,
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            cell: ({ row }) => (
                <Button variant="outline" size="sm" asChild>
                    <Link href={show.url(row.original.id)}>{row.original.status === 'completed' ? 'View' : 'Open'}</Link>
                </Button>
            ),
        },
    ];
}