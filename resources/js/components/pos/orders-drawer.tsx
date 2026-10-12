import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPeso } from '@/lib/money';
import type { PosOrderRow } from '@/lib/pos-session';
import { myOrdersQuery } from '@/lib/pos-session';
import type { DrawerTab } from '@/stores/pos-ui-store';
import { usePosUi } from '@/stores/pos-ui-store';

const STATUS_LABEL: Record<string, string> = {
    open: 'Open',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready',
    completed: 'Completed',
    cancelled: 'Cancelled',
    voided: 'Voided',
};

const PAYMENT_LABEL: Record<string, string> = {
    unpaid: 'Unpaid',
    partial: 'Partly paid',
    paid: 'Paid',
    refunded: 'Refunded',
};

const isDead = (order: PosOrderRow) => order.status === 'cancelled' || order.status === 'voided';
const canPay = (order: PosOrderRow) => !isDead(order) && order.balance_cents > 0;

function StatusText({ order }: { order: PosOrderRow }) {
    if (isDead(order)) {
        return <span className="text-destructive text-sm font-normal">{STATUS_LABEL[order.status]}</span>;
    }

    const paid = order.payment_status === 'paid';

    return <span className={`text-sm font-medium ${paid ? 'text-green-600' : 'text-blue-600'}`}>{PAYMENT_LABEL[order.payment_status] ?? order.payment_status}</span>;
}

export function OrdersDrawer() {
    const drawer = usePosUi((state) => state.drawer);
    const since = usePosUi((state) => state.since);
    const openDrawer = usePosUi((state) => state.openDrawer);
    const closeDrawer = usePosUi((state) => state.closeDrawer);
    const startPaying = usePosUi((state) => state.startPaying);

    const { data, isPending, isError, refetch } = useQuery(myOrdersQuery(since));

    const all = data?.orders ?? [];
    const unpaid = all.filter(canPay);
    const rows = drawer === 'unpaid' ? unpaid : all;

    return (
        <Sheet open={drawer !== null} onOpenChange={(open) => !open && closeDrawer()}>
            <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
                <SheetHeader className="border-b px-3 py-2.5">
                    <SheetTitle className="text-lg">Orders</SheetTitle>
                    <SheetDescription className="text-sm">Orders you took today.</SheetDescription>
                </SheetHeader>

                <Tabs value={drawer ?? 'unpaid'} onValueChange={(value) => openDrawer(value as DrawerTab)} className="flex min-h-0 flex-1 flex-col gap-0">
                    <TabsList className="mx-3 mt-2 grid h-10 grid-cols-2">
                        <TabsTrigger value="unpaid" className="text-sm">
                            Pay later ({unpaid.length})
                        </TabsTrigger>
                        <TabsTrigger value="all" className="text-sm">
                            All today ({all.length})
                        </TabsTrigger>
                    </TabsList>

                    <div className="min-h-0 flex-1 overflow-y-auto p-3">
                        {isPending && <p className="text-muted-foreground py-8 text-center text-base">Loading…</p>}

                        {isError && (
                            <div className="space-y-2 text-center text-base">
                                <p className="text-destructive">Orders could not be loaded.</p>
                                <Button size="sm" variant="outline" onClick={() => refetch()}>
                                    Try again
                                </Button>
                            </div>
                        )}

                        {!isPending && !isError && rows.length === 0 && (
                            <p className="text-muted-foreground py-8 text-center text-base">
                                {drawer === 'unpaid' ? 'No saved orders waiting for payment.' : 'No orders taken yet today.'}
                            </p>
                        )}

                        <div className="divide-y">
                            {rows.map((order) => (
                                <div key={order.id} className="flex items-center justify-between gap-2 py-2">
                                    <div className="min-w-0">
                                        <p className="text-base leading-tight font-medium">
                                            {order.order_number} <StatusText order={order} />
                                        </p>
                                        <p className="text-muted-foreground truncate text-sm">
                                            {new Date(order.created_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })} · {order.items_count}{' '}
                                            {order.items_count === 1 ? 'item' : 'items'} · {order.type === 'dine_in' ? 'Dine in' : 'Takeout'}
                                            {order.customer_name && ` · ${order.customer_name}`}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <div className="text-right text-base tabular-nums">
                                            <p className="font-medium">{formatPeso(order.total_cents)}</p>
                                            {canPay(order) && order.paid_cents > 0 && (
                                                <p className="text-muted-foreground text-sm">{formatPeso(order.balance_cents)} left</p>
                                            )}
                                        </div>
                                        {canPay(order) && (
                                            <Button size="sm" className="h-11 px-4 text-base" onClick={() => startPaying(order)}>
                                                Pay
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}
