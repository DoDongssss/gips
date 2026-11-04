import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';

import type { DataTableFeatures } from '@/components/data-table';
import { SortableHeader } from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { formatChange, formatQty } from '@/lib/inventory';
import { formatPeso } from '@/lib/money';
import { index as ingredientsIndex } from '@/routes/inventory/ingredients';
import { index as movementsIndex } from '@/routes/inventory/movements';

export type UsageRow = {
    ingredient_id: number;
    ingredient: string;
    unit: string;
    purchased: number;
    returned: number;
    used: number;
    waste: number;
    variance: number;
    used_cost_cents: number;
    waste_cost_cents: number;
    returned_cost_cents: number;
    variance_cost_cents: number;
};

export type MarginRow = {
    product_id: number;
    product: string;
    variant: string | null;
    price_cents: number;
    cost_cents: number | null;
    margin_cents: number | null;
    food_cost_pct: number | null;
    needs_conversion: boolean;
};

export type StockRow = {
    id: number;
    name: string;
    unit: string | null;
    quantity: string;
    reorder_level: string;
    value_cents: number;
    is_negative: boolean;
    is_low: boolean;
};

const GOOD_UNDER = 30;
const WARN_UNDER = 40;

function PctBadge({ pct }: { pct: number | null }) {
    if (pct === null) {
        return <span className="text-muted-foreground">—</span>;
    }

    const tone =
        pct < GOOD_UNDER
            ? 'bg-green-100 text-green-800 hover:bg-green-100'
            : pct < WARN_UNDER
              ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
              : 'bg-red-100 text-red-800 hover:bg-red-100';

    return <Badge className={tone}>{pct}%</Badge>;
}

export const usageColumnClassNames: Record<string, string> = {
    ingredient: 'min-w-[10rem]',
    purchased: 'text-right',
    returned: 'text-right',
    used: 'text-right',
    waste: 'text-right',
    variance: 'text-right',
    used_cost_cents: 'text-right',
    waste_cost_cents: 'text-right',
    variance_cost_cents: 'text-right',
};

export function usageColumns(): ColumnDef<DataTableFeatures, UsageRow>[] {
    return [
        {
            id: 'ingredient',
            accessorFn: (row) => row.ingredient,
            header: ({ column }) => <SortableHeader title="Ingredient" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <Link
                    href={movementsIndex.url({ query: { ingredient: row.original.ingredient_id } })}
                    className="font-medium hover:underline"
                >
                    {row.original.ingredient}
                </Link>
            ),
        },
        {
            accessorKey: 'purchased',
            header: ({ column }) => <SortableHeader title="Bought" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {formatQty(row.original.purchased)} {row.original.unit}
                </span>
            ),
        },
        {
            accessorKey: 'returned',
            header: ({ column }) => <SortableHeader title="Returned" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {row.original.returned === 0 ? '—' : `${formatQty(row.original.returned)} ${row.original.unit}`}
                </span>
            ),
        },
        {
            accessorKey: 'used',
            header: ({ column }) => <SortableHeader title="Used by sales" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {formatQty(row.original.used)} {row.original.unit}
                </span>
            ),
        },
        {
            accessorKey: 'waste',
            header: ({ column }) => <SortableHeader title="Waste" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {formatQty(row.original.waste)} {row.original.unit}
                </span>
            ),
        },
        {
            accessorKey: 'variance',
            header: ({ column }) => <SortableHeader title="Variance" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className={`tabular-nums ${row.original.variance < 0 ? 'font-medium text-red-600' : ''}`}>
                    {row.original.variance === 0 ? '—' : `${formatChange(row.original.variance)} ${row.original.unit}`}
                </span>
            ),
        },
        {
            accessorKey: 'used_cost_cents',
            header: ({ column }) => <SortableHeader title="Cost of use" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="tabular-nums">{formatPeso(row.original.used_cost_cents)}</span>,
        },
        {
            accessorKey: 'waste_cost_cents',
            header: ({ column }) => <SortableHeader title="Cost of waste" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="tabular-nums">{formatPeso(row.original.waste_cost_cents)}</span>,
        },
        {
            accessorKey: 'variance_cost_cents',
            header: ({ column }) => (
                <SortableHeader title="Cost of variance" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => (
                <span className={`tabular-nums ${row.original.variance_cost_cents < 0 ? 'text-red-600' : ''}`}>
                    {row.original.variance_cost_cents === 0 ? '—' : formatPeso(row.original.variance_cost_cents)}
                </span>
            ),
        },
    ];
}

export const marginColumnClassNames: Record<string, string> = {
    product: 'min-w-[12rem]',
    price_cents: 'text-right',
    cost_cents: 'text-right',
    margin_cents: 'text-right',
    food_cost_pct: 'text-right',
};

export function marginColumns(): ColumnDef<DataTableFeatures, MarginRow>[] {
    return [
        {
            id: 'product',
            accessorFn: (row) => `${row.product} ${row.variant ?? ''}`,
            header: ({ column }) => <SortableHeader title="Product" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <div>
                    <Link href={`/menu/products/${row.original.product_id}/edit`} className="font-medium hover:underline" prefetch="hover">
                        {row.original.product}
                    </Link>
                    {row.original.variant && <span className="text-muted-foreground"> · {row.original.variant}</span>}
                </div>
            ),
        },
        {
            accessorKey: 'price_cents',
            header: ({ column }) => <SortableHeader title="Price" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="tabular-nums">{formatPeso(row.original.price_cents)}</span>,
        },
        {
            accessorKey: 'cost_cents',
            header: ({ column }) => <SortableHeader title="Recipe cost" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) =>
                row.original.cost_cents === null ? (
                    <Link href="/inventory/units" className="text-amber-700 hover:underline">
                        Needs a unit conversion
                    </Link>
                ) : (
                    <span className="tabular-nums">{formatPeso(row.original.cost_cents)}</span>
                ),
        },
        {
            accessorKey: 'margin_cents',
            header: ({ column }) => <SortableHeader title="Margin" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="tabular-nums">{row.original.margin_cents === null ? '—' : formatPeso(row.original.margin_cents)}</span>
            ),
        },
        {
            accessorKey: 'food_cost_pct',
            header: ({ column }) => <SortableHeader title="Food cost" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <PctBadge pct={row.original.food_cost_pct} />,
        },
    ];
}

export const stockColumnClassNames: Record<string, string> = {
    name: 'min-w-[10rem]',
    quantity: 'text-right',
    reorder_level: 'text-right',
    value_cents: 'text-right',
    flags: 'w-28',
};

export function stockColumns(): ColumnDef<DataTableFeatures, StockRow>[] {
    return [
        {
            accessorKey: 'name',
            header: ({ column }) => <SortableHeader title="Ingredient" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <Link href={ingredientsIndex.url({ query: { search: row.original.name } })} className="font-medium hover:underline">
                    {row.original.name}
                </Link>
            ),
        },
        {
            accessorKey: 'quantity',
            header: ({ column }) => <SortableHeader title="On hand" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {formatQty(row.original.quantity)} {row.original.unit}
                </span>
            ),
        },
        {
            accessorKey: 'reorder_level',
            header: ({ column }) => <SortableHeader title="Reorder at" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => (
                <span className="text-muted-foreground tabular-nums">
                    {Number(row.original.reorder_level) > 0 ? formatQty(row.original.reorder_level) : '—'}
                </span>
            ),
        },
        {
            accessorKey: 'value_cents',
            header: ({ column }) => <SortableHeader title="Value" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />,
            cell: ({ row }) => <span className="tabular-nums">{formatPeso(row.original.value_cents)}</span>,
        },
        {
            id: 'flags',
            enableSorting: false,
            header: '',
            cell: ({ row }) =>
                row.original.is_negative ? (
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Negative</Badge>
                ) : row.original.is_low ? (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Low</Badge>
                ) : null,
        },
    ];
}
