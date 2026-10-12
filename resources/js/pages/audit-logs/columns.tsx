import type { ColumnDef } from '@tanstack/react-table';

import type { DataTableFeatures } from '@/components/data-table';
import { SortableHeader } from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime, formatEventName } from '@/pages/audit-logs/detail_dialog';
import type { AuditLogRow } from '@/pages/audit-logs/detail_dialog';

type ColumnOptions = {
    onDetails: (log: AuditLogRow) => void;
};

// Column widths. Description takes the remaining space; the rest are fixed.
export const columnClassNames: Record<string, string> = {
    created_at: 'w-48',
    causer: 'w-40',
    log: 'w-36',
    event: 'w-44',
    description: 'w-[34%]',
    actions: 'w-28 text-right',
};

function eventVariant(event: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (event) {
        case 'deleted':
        case 'login_failed':
        case 'pin_login_failed':
            return 'destructive';
        case 'created':
        case 'login':
            return 'default';
        case 'updated':
        case 'role_changed':
        case 'credentials_changed':
        case 'credentials_reset':
            return 'secondary';
        default:
            return 'outline';
    }
}

export function getColumns({ onDetails }: ColumnOptions): ColumnDef<DataTableFeatures, AuditLogRow>[] {
    return [
        {
            accessorKey: 'created_at',
            header: ({ column }) => (
                <SortableHeader title="When" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => (
                <time className="whitespace-nowrap" dateTime={row.original.created_at ?? undefined} suppressHydrationWarning>
                    {formatDateTime(row.original.created_at)}
                </time>
            ),
        },
        {
            id: 'causer',
            header: 'Who',
            enableSorting: false,
            cell: ({ row }) => row.original.causer ?? <span className="text-muted-foreground">System</span>,
        },
        {
            accessorKey: 'log',
            header: ({ column }) => (
                <SortableHeader title="Area" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => formatEventName(row.original.log),
        },
        {
            accessorKey: 'event',
            header: ({ column }) => (
                <SortableHeader title="Event" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <Badge variant={eventVariant(row.original.event)}>{formatEventName(row.original.event)}</Badge>,
        },
        {
            accessorKey: 'description',
            header: 'Description',
            enableSorting: false,
            cell: ({ row }) => <span className="line-clamp-2">{row.original.description}</span>,
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            cell: ({ row }) => (
                <Button variant="outline" size="sm" onClick={() => onDetails(row.original)}>
                    Details
                </Button>
            ),
        },
    ];
}