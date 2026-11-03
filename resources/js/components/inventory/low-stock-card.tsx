import { Link } from '@inertiajs/react';
import { PackageCheck, TriangleAlert } from 'lucide-react';

import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import { useLowStock } from '@/hooks/use-low-stock';
import { formatQty } from '@/lib/inventory';
import { index } from '@/routes/inventory/ingredients';

/** Dashboard card: what to reorder. Hidden from people without inventory.view. */
export function LowStockCard() {
    return (
        <Can permission="inventory.view">
            <Card />
        </Can>
    );
}

function Card() {
    const { data, isLoading, isError } = useLowStock();
    const count = data?.count ?? 0;

    return (
        <div className="border-sidebar-border/70 dark:border-sidebar-border flex min-h-48 flex-col rounded-xl border p-4">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h2 className="font-semibold">Low stock</h2>
                    <p className="text-muted-foreground text-xs">At or under the reorder level</p>
                </div>
                {count > 0 ? <TriangleAlert className="size-5 text-amber-600" /> : <PackageCheck className="size-5 text-green-600" />}
            </div>

            <div className="mt-3 flex-1">
                {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
                {isError && <p className="text-destructive text-sm">Stock levels could not be loaded.</p>}

                {data && count === 0 && <p className="text-muted-foreground text-sm">Nothing to reorder right now.</p>}

                {data && count > 0 && (
                    <ul className="space-y-1.5">
                        {data.items.slice(0, 6).map((item) => (
                            <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                                <span className="truncate">{item.name}</span>
                                <span className={`shrink-0 tabular-nums ${item.is_negative ? 'font-medium text-red-600' : 'text-amber-700'}`}>
                                    {formatQty(item.quantity)} {item.unit}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {count > 6 && (
                <Button variant="ghost" size="sm" className="mt-2 self-start px-0" asChild>
                    <Link href={index.url({ query: { filter: 'low' } })}>See all {count}</Link>
                </Button>
            )}
        </div>
    );
}
