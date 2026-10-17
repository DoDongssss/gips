import { Head, Link, router } from '@inertiajs/react';
import { X } from 'lucide-react';
import { useState } from 'react';

import { Pager } from '@/components/inventory/pager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cleanQuery, formatChange, formatUnitCost, movementLabels, referenceLabel } from '@/lib/inventory';
import { index } from '@/routes/inventory/movements';
import type { Paginated } from '@/types/menu';
import type { MovementRow } from '@/types/inventory';

type Filters = { ingredient: number | null; type: string | null; from: string | null; to: string | null };

type Props = {
    movements: Paginated<MovementRow>;
    ingredient: { id: number; name: string } | null;
    types: string[];
    filters: Filters;
};

const ALL = 'all';

const formatWhen = (value: string | null) =>
    value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export default function MovementsIndex({ movements, ingredient, types, filters }: Props) {
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');

    function visit(next: Partial<Filters>) {
        router.get(index.url(), cleanQuery({ ...filters, ...next }), { preserveState: true, replace: true });
    }

    return (
        <>
            <Head title="Stock movements" />

            <div className="space-y-6 p-6">
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold tracking-tight">Stock movements</h1>
                    <p className="text-muted-foreground text-sm">Every change to stock, newest first. This is the ledger; the on-hand numbers are its sum.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {ingredient && (
                        <Badge variant="secondary" className="gap-1 py-1.5">
                            {ingredient.name}
                            <button type="button" aria-label="Show all ingredients" onClick={() => visit({ ingredient: null })}>
                                <X className="size-3.5" />
                            </button>
                        </Badge>
                    )}

                    <Select value={filters.type ?? ALL} onValueChange={(value) => visit({ type: value === ALL ? null : value })}>
                        <SelectTrigger className="w-44" aria-label="Type">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All types</SelectItem>
                            {types.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {movementLabels[type] ?? type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Input type="date" className="w-40" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
                    <Input type="date" className="w-40" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} />
                    <Button variant="outline" onClick={() => visit({ from: from || null, to: to || null })}>
                        Apply dates
                    </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="text-muted-foreground border-b text-left">
                            <tr>
                                <th className="p-3 font-medium">When</th>
                                <th className="p-3 font-medium">Ingredient</th>
                                <th className="p-3 font-medium">Type</th>
                                <th className="p-3 text-right font-medium">Change</th>
                                <th className="p-3 text-right font-medium">Unit cost</th>
                                <th className="p-3 font-medium">Source</th>
                                <th className="p-3 font-medium">By</th>
                                <th className="p-3 font-medium">Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movements.data.map((m) => (
                                <tr key={m.id} className="border-b last:border-0">
                                    <td className="text-muted-foreground p-3 whitespace-nowrap" suppressHydrationWarning>
                                        {formatWhen(m.created_at)}
                                    </td>
                                    <td className="p-3 font-medium">
                                        {ingredient ? (
                                            m.ingredient.name
                                        ) : (
                                            <Link href={index.url({ query: { ingredient: m.ingredient.id } })} className="hover:underline">
                                                {m.ingredient.name}
                                            </Link>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <Badge variant="outline">{movementLabels[m.type] ?? m.type}</Badge>
                                    </td>
                                    <td className={`p-3 text-right font-medium tabular-nums ${Number(m.quantity_change) < 0 ? 'text-red-600' : 'text-green-700'}`}>
                                        {formatChange(m.quantity_change)} {m.unit}
                                    </td>
                                    <td className="text-muted-foreground p-3 text-right tabular-nums">{m.unit_cost_cents === null ? '—' : formatUnitCost(m.unit_cost_cents, m.unit)}</td>
                                    <td className="text-muted-foreground p-3">{referenceLabel(m.reference_type, m.reference_id)}</td>
                                    <td className="p-3">{m.user ?? 'System'}</td>
                                    <td className="text-muted-foreground p-3">{m.notes ?? '—'}</td>
                                </tr>
                            ))}
                            {movements.data.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-muted-foreground p-8 text-center">
                                        No movements match.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pager currentPage={movements.current_page} lastPage={movements.last_page} prevUrl={movements.prev_page_url} nextUrl={movements.next_page_url} />
            </div>
        </>
    );
}

MovementsIndex.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: '/inventory/ingredients' },
        { title: 'Movements', href: index() },
    ],
};
