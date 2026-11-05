import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';

import type { DataTableFeatures } from '@/components/shared/data-table';
import { SortableHeader } from '@/components/shared/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { show } from '@/routes/customers';

export type CustomerRecord = {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    loyalty_points: number;
    orders_count: number;
    created_at: string | null;
};

const formatDate = (value: string | null): string =>
    value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const columnClassNames: Record<string, string> = {
    name: 'w-[26%]',
    phone: 'w-[18%]',
    email: 'w-[28%]',
    loyalty_points: 'w-28 text-right',
    orders_count: 'w-24 text-right',
    created_at: 'w-32',
    actions: 'w-28 text-right',
};

export function getColumns(): ColumnDef<DataTableFeatures, CustomerRecord>[] {
    return [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <SortableHeader title="Name" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        },
        {
            accessorKey: 'phone',
            header: ({ column }) => (
                <SortableHeader title="Phone" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.original.phone ?? '—'}</span>,
        },
        {
            accessorKey: 'email',
            header: ({ column }) => (
                <SortableHeader title="Email" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.email ?? '—'}</span>,
        },
        {
            accessorKey: 'loyalty_points',
            header: ({ column }) => (
                <SortableHeader title="Points" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => (
                <div className="text-right">
                    {row.original.loyalty_points > 0 ? (
                        <Badge variant="secondary" className="tabular-nums">
                            {row.original.loyalty_points}
                        </Badge>
                    ) : (
                        <span className="text-muted-foreground tabular-nums">0</span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'orders_count',
            header: ({ column }) => (
                <SortableHeader title="Orders" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <span className="block text-right tabular-nums">{row.original.orders_count}</span>,
        },
        {
            accessorKey: 'created_at',
            header: ({ column }) => (
                <SortableHeader title="Joined" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <span className="text-muted-foreground text-sm">{formatDate(row.original.created_at)}</span>,
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            cell: ({ row }) => (
                <Button variant="outline" size="sm" asChild>
                    <Link href={show.url(row.original.id)}>View</Link>
                </Button>
            ),
        },
    ];
}
