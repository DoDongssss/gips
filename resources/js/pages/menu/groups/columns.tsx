import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';

import { AvailabilitySwitch } from '@/components/availability-switch';
import { Can } from '@/components/can';
import type { DataTableFeatures } from '@/components/data-table';
import { IconActionTooltip } from '@/components/icon-action-tooltip';
import { SortableHeader } from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDelta } from '@/lib/money';
import type { GroupRecord } from '@/pages/menu/groups/form-dialog';
import { availability } from '@/routes/menu/modifiers';
import { index as productsIndex } from '@/routes/menu/products';

type ColumnOptions = {
    canUpdate: boolean;
    canCreate: boolean;
    canDelete: boolean;
    canReorder: boolean;
    trashed: boolean;
    onEdit: (group: GroupRecord) => void;
    onDelete: (group: GroupRecord) => void;
    onDuplicate: (group: GroupRecord) => void;
    onMove: (group: GroupRecord, direction: 'up' | 'down') => void;
    onRestore: (group: GroupRecord) => void;
    selectedIds: Set<number>;
    onToggle: (id: number, checked: boolean) => void;
    onToggleAll: (checked: boolean, rows: GroupRecord[]) => void;
    rows: GroupRecord[];
};

export const columnClassNames: Record<string, string> = {
    select: 'w-10',
    name: 'w-[18%]',
    selection_type: 'w-44',
    modifiers: 'w-[34%]',
    products_count: 'w-28',
    is_active: 'w-28',
    actions: 'min-w-[11.5rem] w-[11.5rem] text-right align-middle',
};

export function getColumns(options: ColumnOptions): ColumnDef<DataTableFeatures, GroupRecord>[] {
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
            header: ({ column }) => <SortableHeader title="Group" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) =>
                options.canUpdate && !options.trashed ? (
                    <button type="button" onClick={() => options.onEdit(row.original)} className="font-medium hover:underline">
                        {row.original.name}
                    </button>
                ) : (
                    <span className="font-medium">{row.original.name}</span>
                ),
        },
        {
            accessorKey: 'selection_type',
            header: ({ column }) => <SortableHeader title="Rule" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
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
                                {modifier.has_stock_rules && (
                                    <Badge variant="secondary" className="ml-2">
                                        Stock
                                    </Badge>
                                )}
                                <span className="text-muted-foreground ml-2 text-xs">{formatDelta(modifier.price_delta_cents)}</span>
                            </span>
                            {!options.trashed && (
                                <Can permission="menu.availability">
                                    <AvailabilitySwitch
                                        url={availability.url(modifier.id)}
                                        available={modifier.is_available}
                                        label={modifier.name}
                                        only={['groups', 'filters']}
                                    />
                                </Can>
                            )}
                        </li>
                    ))}
                </ul>
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
                        href={productsIndex.url({ query: { modifier_group: String(row.original.id) } })}
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
                const group = row.original;

                return (
                    <div className="flex shrink-0 items-center justify-end gap-0.5 whitespace-nowrap">
                        {options.canReorder && !options.trashed && (
                            <>
                                <IconActionTooltip label="Move up">
                                    <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Move up" onClick={() => options.onMove(group, 'up')}>
                                        <ArrowUp className="size-4" />
                                    </Button>
                                </IconActionTooltip>
                                <IconActionTooltip label="Move down">
                                    <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Move down" onClick={() => options.onMove(group, 'down')}>
                                        <ArrowDown className="size-4" />
                                    </Button>
                                </IconActionTooltip>
                            </>
                        )}
                        {options.trashed ? (
                            <Can permission="menu.update">
                                <Button type="button" size="sm" variant="outline" onClick={() => options.onRestore(group)}>
                                    Restore
                                </Button>
                            </Can>
                        ) : (
                            <>
                                <Can permission="menu.update">
                                    <Button type="button" size="sm" variant="outline" onClick={() => options.onEdit(group)}>
                                        Edit
                                    </Button>
                                </Can>
                                <Can permission="menu.create">
                                    <IconActionTooltip label="Duplicate">
                                        <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Duplicate" onClick={() => options.onDuplicate(group)}>
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
                                            onClick={() => options.onDelete(group)}
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
