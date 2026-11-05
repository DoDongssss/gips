import { useQuery } from '@tanstack/react-query';
import { BellRing, Tablet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { readyOrdersQuery } from '@/lib/kds';
import { kioskOrdersQuery } from '@/lib/kiosk/orders';
import { formatPeso } from '@/lib/money';
import { usePosUi } from '@/stores/pos-ui-store';

/** Kiosk orders waiting for payment and kitchen-ready pickup — one bell on the register header. */
export function PosOrderNotificationsBell() {
    const openDrawer = usePosUi((state) => state.openDrawer);
    const { data: kioskOrders } = useQuery(kioskOrdersQuery());
    const { data: readyOrders } = useQuery(readyOrdersQuery());

    const kiosk = kioskOrders ?? [];
    const ready = readyOrders ?? [];
    const count = kiosk.length + ready.length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="relative h-11 w-11 shrink-0 border-gray-200 px-0"
                    aria-label={count > 0 ? `${count} register notifications` : 'No register notifications'}
                >
                    <BellRing className="size-5 text-gray-700" />
                    {count > 0 && (
                        <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs leading-5 font-semibold text-white tabular-nums">
                            {count > 99 ? '99+' : count}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {count === 0 ? (
                    <p className="text-muted-foreground px-2 py-4 text-center text-sm">No kiosk or ready orders right now.</p>
                ) : (
                    <div className="max-h-80 overflow-y-auto">
                        {kiosk.length > 0 && (
                            <>
                                <p className="text-muted-foreground flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium uppercase tracking-wide">
                                    <Tablet className="size-3.5" />
                                    Kiosk — pay at counter ({kiosk.length})
                                </p>
                                <ul>
                                    {kiosk.map((order) => (
                                        <li key={order.id}>
                                            <DropdownMenuItem
                                                className="flex flex-col items-start gap-0.5 py-2"
                                                onSelect={() => openDrawer('kiosk')}
                                            >
                                                <span className="font-medium">{order.order_number}</span>
                                                <span className="text-muted-foreground text-xs">
                                                    {formatPeso(order.balance_cents)} due
                                                    {order.customer_name ? ` · ${order.customer_name}` : ''}
                                                    {order.requires_verification ? ' · ID check' : ''}
                                                </span>
                                            </DropdownMenuItem>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {kiosk.length > 0 && ready.length > 0 && <DropdownMenuSeparator />}

                        {ready.length > 0 && (
                            <>
                                <p className="text-muted-foreground px-2 py-1.5 text-xs font-medium uppercase tracking-wide">
                                    Ready for pickup ({ready.length})
                                </p>
                                <ul>
                                    {ready.map((order) => (
                                        <li key={order.id}>
                                            <DropdownMenuItem
                                                className="flex flex-col items-start gap-0.5 py-2"
                                                onSelect={() => openDrawer('ready')}
                                            >
                                                <span className="font-medium">{order.order_number}</span>
                                                <span className="text-muted-foreground text-xs">
                                                    {order.items_count} {order.items_count === 1 ? 'item' : 'items'}
                                                    {order.balance_cents > 0 ? ` · ${formatPeso(order.balance_cents)} to collect` : ' · Paid'}
                                                    {order.customer_name ? ` · ${order.customer_name}` : ''}
                                                </span>
                                            </DropdownMenuItem>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                )}

                {count > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => openDrawer(kiosk.length > 0 ? 'kiosk' : 'ready')}>Open in orders</DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
