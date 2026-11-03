import type { ColumnDef } from '@tanstack/react-table';

import { Can } from '@/components/can';
import type { DataTableFeatures } from '@/components/data-table';
import { SortableHeader } from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPeso } from '@/lib/money';
import type { DiscountRecord } from '@/pages/discounts/form-dialog';

type ColumnOptions = {
    onEdit: (discount: DiscountRecord) => void;
};

// Column widths. Rules takes the remaining space; the rest are fixed.
export const columnClassNames: Record<string, string> = {
    name: 'w-[22%]',
    code: 'w-28',
    value: 'w-32',
    applies_to: 'w-32',
    rules: 'w-[26%]',
    window: 'w-48',
    is_active: 'w-28',
    actions: 'w-24 text-right',
};

export const describeValue = (discount: DiscountRecord): string =>
    discount.type === 'percent' ? `${discount.value / 100}%` : formatPeso(discount.value);

const formatDate = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function windowLabel(discount: DiscountRecord): string {
    if (!discount.starts_at && !discount.ends_at) {
        return 'Always';
    }

    if (discount.starts_at && discount.ends_at) {
        return `${formatDate(discount.starts_at)} – ${formatDate(discount.ends_at)}`;
    }

    return discount.starts_at ? `From ${formatDate(discount.starts_at)}` : `Until ${formatDate(discount.ends_at!)}`;
}

export function getColumns({ onEdit }: ColumnOptions): ColumnDef<DataTableFeatures, DiscountRecord>[] {
    return [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <SortableHeader title="Name" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        },
        {
            accessorKey: 'code',
            header: ({ column }) => (
                <SortableHeader title="Code" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.code ?? '—'}</span>,
        },
        {
            accessorKey: 'value',
            header: ({ column }) => (
                <SortableHeader title="Discount" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => describeValue(row.original),
        },
        {
            accessorKey: 'applies_to',
            header: 'Applies to',
            enableSorting: false,
            cell: ({ row }) => (row.original.applies_to === 'order' ? 'Whole order' : 'One item'),
        },
        {
            id: 'rules',
            header: 'Rules',
            enableSorting: false,
            cell: ({ row }) => {
                const d = row.original;
                const rules = [d.requires_id && 'ID required', d.requires_approval && 'Manager approval', d.is_vat_exempt && 'VAT exempt'].filter(Boolean);

                return rules.length === 0 ? (
                    <span className="text-muted-foreground">None</span>
                ) : (
                    <div className="flex flex-wrap gap-1">
                        {rules.map((rule) => (
                            <Badge key={String(rule)} variant="outline">
                                {rule}
                            </Badge>
                        ))}
                    </div>
                );
            },
        },
        {
            id: 'window',
            header: 'Runs',
            enableSorting: false,
            cell: ({ row }) => <span className="text-muted-foreground" suppressHydrationWarning>{windowLabel(row.original)}</span>,
        },
        {
            accessorKey: 'is_active',
            header: ({ column }) => (
                <SortableHeader title="Status" sorted={column.getIsSorted()} onToggle={column.getToggleSortingHandler()} />
            ),
            cell: ({ row }) => (
                <Badge variant={row.original.is_active ? 'default' : 'secondary'}>{row.original.is_active ? 'Active' : 'Off'}</Badge>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <Can permission="discount.manage">
                        <Button variant="outline" size="sm" onClick={() => onEdit(row.original)}>
                            Edit
                        </Button>
                    </Can>
                </div>
            ),
        },
    ];
}
