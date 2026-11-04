import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, Copy, ImageIcon, Trash2 } from 'lucide-react';

import { Can } from '@/components/can';
import type { DataTableFeatures } from '@/components/data-table';
import { IconActionTooltip } from '@/components/icon-action-tooltip';
import { SortableHeader } from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { CategoryRecord } from '@/pages/menu/categories/form_dialog';
import { index as productsIndex } from '@/routes/menu/products';

type ColumnOptions = {
    canUpdate: boolean;
    canCreate: boolean;
    canDelete: boolean;
    canReorder: boolean;
    trashed: boolean;
    onEdit: (category: CategoryRecord) => void;
    onDelete: (category: CategoryRecord) => void;
    onDuplicate: (category: CategoryRecord) => void;
    onMove: (category: CategoryRecord, direction: 'up' | 'down') => void;
    onRestore: (category: CategoryRecord) => void;
    selectedIds: Set<number>;
    onToggle: (id: number, checked: boolean) => void;
    onToggleAll: (checked: boolean, rows: CategoryRecord[]) => void;
    rows: CategoryRecord[];
};

export const columnClassNames: Record<string, string> = {
    select: 'w-10',
    name: 'w-[26%]',
    description: 'w-[28%]',
    station_name: 'w-36',
    products_count: 'w-28',
    is_active: 'w-28',
    actions: 'min-w-[11.5rem] w-[11.5rem] text-right align-middle',
};

export function getColumns(options: ColumnOptions): ColumnDef<DataTableFeatures, CategoryRecord>[] {
    const allSelected = options.rows.length > 0 && options.rows.every((row) => options.selectedIds.has(row.id));

    return [
        {
            id: 'select',
            header: () => (
                <Checkbox
                    checked={allSelected}
                    onCheckedChange={(value) => options.onToggleAll(value === true, options.rows)}
                    aria-label="Select all on this page"
                />
            ),
            enableSorting: false,
            cell: ({ row }) => (
                <Checkbox
                    checked={options.selectedIds.has(row.original.id)}
                    onCheckedChange={(value) => options.onToggle(row.original.id, value === true)}
                    aria-label={`Select ${row.original.name}`}
                />
            ),
        },
        {
            accessorKey: 'name',
            header: ({ column }) => <SortableHeader title="Name" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => {
                const category = row.original;

                return (
                    <div className="flex items-center gap-3">
                        {category.image_url ? (
                            <img src={category.image_url} alt="" className="size-10 rounded-md object-cover" />
                        ) : (
                            <div className="bg-muted grid size-10 place-items-center rounded-md">
                                <ImageIcon className="text-muted-foreground size-4" />
                            </div>
                        )}
                        <div className="min-w-0">
                            {options.canUpdate && !options.trashed ? (
                                <button type="button" onClick={() => options.onEdit(category)} className="font-medium hover:underline">
                                    {category.name}
                                </button>
                            ) : (
                                <span className="font-medium">{category.name}</span>
                            )}
                            <p className="text-muted-foreground truncate text-xs">{category.slug}</p>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'description',
            header: 'Description',
            enableSorting: false,
            cell: ({ row }) => <span className="text-muted-foreground line-clamp-1">{row.original.description ?? '—'}</span>,
        },
        {
            id: 'station_name',
            accessorFn: (row) => row.station_name ?? 'Unassigned',
            header: 'Kitchen station',
            enableSorting: false,
            cell: ({ row }) =>
                row.original.station_name ? (
                    <span>{row.original.station_name}</span>
                ) : (
                    <Link href="/stations" className="text-muted-foreground hover:underline">
                        Unassigned
                    </Link>
                ),
        },
        {
            accessorKey: 'products_count',
            header: ({ column }) => <SortableHeader title="Products" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) =>
                row.original.products_count === 0 ? (
                    <span className="text-muted-foreground">0</span>
                ) : (
                    <Link
                        href={productsIndex.url({ query: { category_id: String(row.original.id) } })}
                        className="font-medium tabular-nums hover:underline"
                    >
                        {row.original.products_count}
                    </Link>
                ),
        },
        {
            accessorKey: 'is_active',
            header: ({ column }) => <SortableHeader title="Status" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <Badge variant={row.original.is_active ? 'default' : 'secondary'}>{row.original.is_active ? 'Visible' : 'Hidden'}</Badge>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            cell: ({ row }) => {
                const category = row.original;

                return (
                    <div className="flex shrink-0 items-center justify-end gap-0.5 whitespace-nowrap">
                        {options.canReorder && !options.trashed && (
                            <>
                                <IconActionTooltip label="Move up">
                                    <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Move up" onClick={() => options.onMove(category, 'up')}>
                                        <ArrowUp className="size-4" />
                                    </Button>
                                </IconActionTooltip>
                                <IconActionTooltip label="Move down">
                                    <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Move down" onClick={() => options.onMove(category, 'down')}>
                                        <ArrowDown className="size-4" />
                                    </Button>
                                </IconActionTooltip>
                            </>
                        )}
                        {options.trashed ? (
                            <Can permission="menu.update">
                                <Button type="button" size="sm" variant="outline" onClick={() => options.onRestore(category)}>
                                    Restore
                                </Button>
                            </Can>
                        ) : (
                            <>
                                <Can permission="menu.update">
                                    <Button type="button" size="sm" variant="outline" onClick={() => options.onEdit(category)}>
                                        Edit
                                    </Button>
                                </Can>
                                <Can permission="menu.create">
                                    <IconActionTooltip label="Duplicate">
                                        <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Duplicate" onClick={() => options.onDuplicate(category)}>
                                            <Copy className="size-4" />
                                        </Button>
                                    </IconActionTooltip>
                                </Can>
                                <Can permission="menu.delete">
                                    <IconActionTooltip label="Delete">
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="size-8 text-destructive hover:text-destructive"
                                            aria-label="Delete"
                                            onClick={() => options.onDelete(category)}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </IconActionTooltip>
                                </Can>
                            </>
                        )}
                    </div>
                );
            },
        },
    ];
}
