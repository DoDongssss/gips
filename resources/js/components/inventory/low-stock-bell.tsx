import { Link } from '@inertiajs/react';
import { Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCan } from '@/hooks/use-can';
import { useLowStock } from '@/hooks/use-low-stock';
import { formatQty } from '@/lib/inventory';
import { index } from '@/routes/inventory/ingredients';

/** Header bell: a red count when anything is at or under its reorder level, with the list on click. Renders nothing without inventory.view. */
export function LowStockBell() {
    const { can } = useCan();
    const { data } = useLowStock();

    if (!can('inventory.view')) {
        return null;
    }

    const count = data?.count ?? 0;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label={count > 0 ? `${count} ingredients low on stock` : 'No stock alerts'}>
                    <Bell className="size-5" />
                    {count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-4 font-semibold text-white">
                            {count > 99 ? '99+' : count}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Low stock</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {count === 0 ? (
                    <p className="text-muted-foreground px-2 py-4 text-center text-sm">Everything is above its reorder level.</p>
                ) : (
                    <ul className="max-h-72 overflow-y-auto">
                        {data!.items.slice(0, 8).map((item) => (
                            <li key={item.id} className="flex items-center justify-between gap-3 px-2 py-1.5 text-sm">
                                <span className="truncate">{item.name}</span>
                                <span className={`shrink-0 tabular-nums ${item.is_negative ? 'font-medium text-red-600' : 'text-amber-700'}`}>
                                    {formatQty(item.quantity)} {item.unit}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}

                <DropdownMenuSeparator />
                <div className="p-1">
                    <Button variant="ghost" size="sm" className="w-full" asChild>
                        <Link href={index.url({ query: { filter: 'low' } })}>{count > 8 ? `See all ${count}` : 'Open ingredients'}</Link>
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
