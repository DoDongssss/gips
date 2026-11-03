import type { ColumnDef } from '@tanstack/react-table';
import { router } from '@inertiajs/react';
import { ImageIcon } from 'lucide-react';

import { AvailabilitySwitch } from '@/components/availability-switch';
import { Can } from '@/components/can';
import type { DataTableFeatures } from '@/components/data-table';
import { SortableHeader } from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPeso } from '@/lib/money';
import { availability, destroy } from '@/routes/menu/products';
import type { ProductRow } from '@/types/menu';

type ColumnOptions = {
    canAvailability: boolean;
    canUpdate: boolean;
    onEdit: (product: ProductRow) => void;
};

// Column widths. Product takes the remaining space; the rest are fixed.
export const columnClassNames: Record<string, string> = {
    name: 'w-[34%]',
    category_name: 'w-44',
    base_price_cents: 'w-36',
    is_available: 'w-40',
    actions: 'w-40 text-right',
};

function remove(product: ProductRow) {
    if (confirm(`Delete "${product.name}"? Past orders keep their records.`)) {
        router.delete(destroy.url(product.id), { preserveScroll: true });
    }
}

export function getColumns({ canAvailability, canUpdate, onEdit }: ColumnOptions): ColumnDef<DataTableFeatures, ProductRow>[] {
    return [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <SortableHeader title="Product" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
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
                            {canUpdate ? (
                                <button type="button" onClick={() => onEdit(product)} className="font-medium hover:underline">
                                    {product.name}
                                </button>
                            ) : (
                                <span className="font-medium">{product.name}</span>
                            )}
                            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                {product.sku && <span>{product.sku}</span>}
                                {product.variants_count > 0 && <span>{product.variants_count} sizes</span>}
                                {!product.is_active && <Badge variant="outline">Hidden</Badge>}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'category_name',
            header: ({ column }) => (
                <SortableHeader title="Category" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.category_name ?? '—'}</span>,
        },
        {
            accessorKey: 'base_price_cents',
            header: ({ column }) => (
                <SortableHeader title="Price" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {row.original.variants_count > 0 ? 'From sizes' : formatPeso(row.original.base_price_cents)}
                </span>
            ),
        },
        {
            accessorKey: 'is_available',
            header: ({ column }) => (
                <SortableHeader title="Availability" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) =>
                canAvailability ? (
                    <AvailabilitySwitch url={availability.url(row.original.id)} available={row.original.is_available} label={row.original.name} />
                ) : (
                    <Badge variant={row.original.is_available ? 'default' : 'secondary'}>
                        {row.original.is_available ? 'Available' : 'Sold out'}
                    </Badge>
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
                        <Button variant="outline" size="sm" className="text-destructive" onClick={() => remove(row.original)}>
                            Delete
                        </Button>
                    </Can>
                </div>
            ),
        },
    ];
}