import type { ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, Copy, ImageIcon, Trash2 } from 'lucide-react';

import { AvailabilitySwitch } from '@/components/availability-switch';
import { Can } from '@/components/can';
import type { DataTableFeatures } from '@/components/data-table';
import { IconActionTooltip } from '@/components/icon-action-tooltip';
import { SortableHeader } from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatPeso } from '@/lib/money';
import { availability } from '@/routes/menu/products';
import type { ProductRow } from '@/types/menu';

type ColumnOptions = {
    canAvailability: boolean;
    canUpdate: boolean;
    canCreate: boolean;
    canDelete: boolean;
    canReorder: boolean;
    trashed: boolean;
    onEdit: (product: ProductRow) => void;
    onDelete: (product: ProductRow) => void;
    onDuplicate: (product: ProductRow) => void;
    onMove: (product: ProductRow, direction: 'up' | 'down') => void;
    onRestore: (product: ProductRow) => void;
    selectedIds: Set<number>;
    onToggle: (id: number, checked: boolean) => void;
    onToggleAll: (checked: boolean, rows: ProductRow[]) => void;
    rows: ProductRow[];
};

export const columnClassNames: Record<string, string> = {
    select: 'w-10',
    name: 'w-[32%]',
    category_name: 'w-36',
    base_price_cents: 'w-32',
    recipe_status: 'w-36',
    is_available: 'w-36',
    actions: 'min-w-[11.5rem] w-[11.5rem] text-right align-middle',
};

function RecipeBadge({ status }: { status: ProductRow['recipe_status'] }) {
    if (status === 'ok') {
        return <Badge variant="secondary">Recipe</Badge>;
    }

    if (status === 'needs_conversion') {
        return <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Conversion</Badge>;
    }

    return <Badge variant="outline">No recipe</Badge>;
}

export function getColumns(options: ColumnOptions): ColumnDef<DataTableFeatures, ProductRow>[] {
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
            header: ({ column }) => <SortableHeader title="Product" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => {
                const product = row.original;

                return (
                    <div className="flex items-center gap-3">
                        {product.image_url ? (
                            <img src={product.image_url} alt="" className="size-10 rounded-md object-cover" />
                        ) : (
                            <div className="bg-muted grid size-10 place-items-center rounded-md">
                                <ImageIcon className="text-muted-foreground size-4" />
                            </div>
                        )}
                        <div className="min-w-0">
                            {options.canUpdate && !options.trashed ? (
                                <button type="button" onClick={() => options.onEdit(product)} className="font-medium hover:underline">
                                    {product.name}
                                </button>
                            ) : (
                                <span className="font-medium">{product.name}</span>
                            )}
                            <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                                {product.sku && <span>{product.sku}</span>}
                                {product.variants_count > 0 && <span>{product.variants_count} sizes</span>}
                                {product.modifier_groups_count > 0 && <span>{product.modifier_groups_count} add-ons</span>}
                                <span>{product.station_label}</span>
                                {!product.is_active && <Badge variant="outline">Hidden</Badge>}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'category_name',
            header: ({ column }) => <SortableHeader title="Category" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.category_name ?? '—'}</span>,
        },
        {
            accessorKey: 'base_price_cents',
            header: ({ column }) => <SortableHeader title="Price" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {row.original.variants_count > 0 ? `From ${formatPeso(row.original.min_price_cents)}` : formatPeso(row.original.base_price_cents)}
                </span>
            ),
        },
        {
            accessorKey: 'recipe_status',
            header: 'Inventory',
            enableSorting: false,
            cell: ({ row }) => <RecipeBadge status={row.original.recipe_status} />,
        },
        {
            accessorKey: 'is_available',
            header: ({ column }) => <SortableHeader title="Availability" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) =>
                options.trashed ? (
                    <span className="text-muted-foreground text-sm">Deleted</span>
                ) : options.canAvailability ? (
                    <AvailabilitySwitch url={availability.url(row.original.id)} available={row.original.is_available} label={row.original.name} />
                ) : (
                    <Badge variant={row.original.is_available ? 'default' : 'secondary'}>{row.original.is_available ? 'Available' : 'Sold out'}</Badge>
                ),
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            cell: ({ row }) => {
                const product = row.original;

                return (
                    <div className="flex shrink-0 items-center justify-end gap-0.5 whitespace-nowrap">
                        {options.canReorder && !options.trashed && (
                            <>
                                <IconActionTooltip label="Move up">
                                    <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Move up" onClick={() => options.onMove(product, 'up')}>
                                        <ArrowUp className="size-4" />
                                    </Button>
                                </IconActionTooltip>
                                <IconActionTooltip label="Move down">
                                    <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Move down" onClick={() => options.onMove(product, 'down')}>
                                        <ArrowDown className="size-4" />
                                    </Button>
                                </IconActionTooltip>
                            </>
                        )}
                        {options.trashed ? (
                            <Can permission="menu.update">
                                <Button type="button" size="sm" variant="outline" onClick={() => options.onRestore(product)}>
                                    Restore
                                </Button>
                            </Can>
                        ) : (
                            <>
                                <Can permission="menu.update">
                                    <Button type="button" size="sm" variant="outline" onClick={() => options.onEdit(product)}>
                                        Edit
                                    </Button>
                                </Can>
                                <Can permission="menu.create">
                                    <IconActionTooltip label="Duplicate">
                                        <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Duplicate" onClick={() => options.onDuplicate(product)}>
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
                                            onClick={() => options.onDelete(product)}
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
