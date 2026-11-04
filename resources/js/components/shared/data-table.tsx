import { FlexRender, rowSortingFeature, tableFeatures, useTable } from '@tanstack/react-table';
import type { ColumnDef, RowData, SortingState } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

// Sorting is registered, but done server-side (Laravel), so there is no
// sortedRowModel here. Pagination/search are also handled by Inertia.
export const dataTableFeatures = tableFeatures({ rowSortingFeature });

export type DataTableFeatures = typeof dataTableFeatures;

type DataTableProps<TData extends RowData> = {
    columns: ColumnDef<DataTableFeatures, TData, unknown>[];
    data: TData[];
    sorting: SortingState;
    onSortingChange: (sorting: SortingState) => void;
    /** Extra classes per column id, applied to both the header and body cells (e.g. widths). */
    columnClassNames?: Record<string, string>;
    /** Shown in the body when there are no rows (text or any node, e.g. a button). */
    emptyContent?: ReactNode;
};

export function DataTable<TData extends RowData>({
    columns,
    data,
    sorting,
    onSortingChange,
    columnClassNames = {},
    emptyContent = 'No results.',
}: DataTableProps<TData>) {
    const table = useTable({
        features: dataTableFeatures,
        columns,
        data,
        manualSorting: true,
        enableMultiSort: false,
        state: { sorting },
        onSortingChange: (updater) => onSortingChange(typeof updater === 'function' ? updater(sorting) : updater),
    });

    return (
        <div className="overflow-hidden rounded-lg border">
            <Table>
                <TableHeader className="bg-muted/50">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className="hover:bg-transparent">
                            {headerGroup.headers.map((header) => (
                                <TableHead
                                    key={header.id}
                                    colSpan={header.colSpan}
                                    className={cn('h-12 px-4 text-xs font-medium', columnClassNames[header.column.id])}
                                >
                                    {header.isPlaceholder ? null : <FlexRender header={header} />}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id}>
                                {row.getAllCells().map((cell) => (
                                    <TableCell key={cell.id} className={cn('px-4 py-3', columnClassNames[cell.column.id])}>
                                        <FlexRender cell={cell} />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={columns.length} className="text-muted-foreground h-48 text-center">
                                {emptyContent}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}