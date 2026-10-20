import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { usePosSince } from '@/hooks/use-pos-since';
import { isKioskOrder, kioskOrdersQuery } from '@/lib/kiosk-orders';
import { cancelEditing, startEditing } from '@/lib/order-edit';
import { completeOrder, readyOrdersQuery } from '@/lib/kds';
import type { ReadyOrder } from '@/lib/kds';
import { formatPeso } from '@/lib/money';
import { orderAction } from '@/lib/pos-api';
import { errorList } from '@/lib/pos-http';
import type { PosOrderRow } from '@/lib/pos-session';
import { myOrdersQuery } from '@/lib/pos-session';
import type { DrawerTab } from '@/stores/pos-ui-store';
import { useCartStore } from '@/stores/cart-store';
import { useOrderEdit } from '@/stores/order-edit-store';
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
/** An order can go back into the cart only while nobody has paid and the kitchen has not started. */
const canEdit = (order: PosOrderRow) => order.status === 'open' && order.payment_status === 'unpaid' && order.paid_cents === 0;

/** Small tags for orders that came from the kiosk tablet. */
function KioskTags({ order }: { order: PosOrderRow }) {
    if (!isKioskOrder(order)) return null;

    return (
        <span className="ml-1 inline-flex items-center gap-1 align-middle">
            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">Kiosk</span>
            {order.requires_verification && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">ID check</span>
            )}
        </span>
    );
}

function StatusText({ order }: { order: PosOrderRow }) {
    if (isDead(order)) {
        return <span className="text-destructive text-sm font-normal">{STATUS_LABEL[order.status]}</span>;
    }

    const paid = order.payment_status === 'paid';

    return (
        <span className={`text-sm font-medium ${paid ? 'text-green-600' : 'text-blue-600'}`}>
            {PAYMENT_LABEL[order.payment_status] ?? order.payment_status}
        </span>
    );
}

/** Orders the kitchen finished. The cashier hands them over here, which completes the order. */
function ReadyList({ orders, onPay }: { orders: ReadyOrder[]; onPay: (orderId: number) => void }) {
    const queryClient = useQueryClient();
    const handOver = useMutation({
        mutationFn: (orderId: number) => completeOrder(orderId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pos'] }),
        onError: (error) => errorList(error).forEach((message) => toast.error(message)),
    });

    if (orders.length === 0) {
        return <p className="text-muted-foreground py-8 text-center text-base">No orders waiting at the counter.</p>;
    }

    return (
        <div className="divide-y">
            {orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                        <p className="text-lg leading-tight font-semibold">{order.order_number}</p>
                        <p className="text-muted-foreground truncate text-sm">
                            {order.items_count} {order.items_count === 1 ? 'item' : 'items'} ·{' '}
                            {order.type === 'dine_in' ? 'Dine in' : 'Takeout'}
                            {order.customer_name && ` · ${order.customer_name}`}
                        </p>
                    </div>
                    {order.balance_cents > 0 ? (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-11 px-4 text-base"
                            onClick={() => onPay(order.id)}
                        >
                            Pay {formatPeso(order.balance_cents)}
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            className="h-11 px-4 text-base"
                            disabled={handOver.isPending}
                            onClick={() => handOver.mutate(order.id)}
                        >
                            Hand over
                        </Button>
                    )}
                </div>
            ))}
        </div>
    );
}

export function OrdersDrawer() {
    const queryClient = useQueryClient();
    const drawer = usePosUi((state) => state.drawer);
    const since = usePosSince();
    const openDrawer = usePosUi((state) => state.openDrawer);
    const closeDrawer = usePosUi((state) => state.closeDrawer);
    const startPaying = usePosUi((state) => state.startPaying);

    const { data, isPending, isError, refetch } = useQuery(myOrdersQuery(since));

    const ready = useQuery({ ...readyOrdersQuery(), enabled: drawer !== null });
    const kiosk = useQuery(kioskOrdersQuery());
    const [search, setSearch] = useState('');
    const [cancelling, setCancelling] = useState<PosOrderRow | null>(null);
    const [reason, setReason] = useState('');
    const cancel = useMutation({
        mutationFn: (order: PosOrderRow) => orderAction(order.id, 'cancel', { reason: reason.trim() }),
        onSuccess: (_data, order) => {
            if (useOrderEdit.getState().editing?.id === order.id) {
                cancelEditing();
            }

            toast.success(`Order ${order.order_number} cancelled.`);
            setCancelling(null);
            setReason('');
            void queryClient.invalidateQueries({ queryKey: ['pos'] });
        },
        onError: (error) => errorList(error).forEach((message) => toast.error(message)),
    });
    const edit = useMutation({
        mutationFn: async (orderId: number) => {
            if (useCartStore.getState().lines.length > 0 && useOrderEdit.getState().editing === null) {
                toast.error('Finish or clear the order in the cart first.');

                return false;
            }

            await startEditing(orderId);

            return true;
        },
        onSuccess: (started) => started && closeDrawer(),
        onError: (error) => errorList(error).forEach((message) => toast.error(message)),
    });

    // Kiosk orders belong to the kiosk, not to one cashier, so they are added to this cashier's list.
    const mine = data?.orders ?? [];
    const kioskOrders = (kiosk.data ?? []).filter((order) => !mine.some((row) => row.id === order.id));
    const all: PosOrderRow[] = [...kioskOrders, ...mine];
    const unpaid = all.filter(canPay);
    const term = search.trim().toLowerCase();
    const matches = (order: PosOrderRow) => term === '' || order.order_number.toLowerCase().includes(term);
    const rows = (drawer === 'unpaid' ? unpaid : drawer === 'all' ? all : []).filter(matches);
    const readyOrders = ready.data ?? [];

    return (
        <Sheet open={drawer !== null} onOpenChange={(open) => !open && closeDrawer()}>
            <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
                <SheetHeader className="border-b px-3 py-2.5">
                    <SheetTitle className="text-lg">Orders</SheetTitle>
                    <SheetDescription className="text-sm">Orders you took today.</SheetDescription>
                </SheetHeader>

                <Tabs
                    value={drawer ?? 'unpaid'}
                    onValueChange={(value) => openDrawer(value as DrawerTab)}
                    className="flex min-h-0 flex-1 flex-col gap-0"
                >
                    <TabsList className="mx-3 mt-2 grid h-10 grid-cols-3">
                        <TabsTrigger value="unpaid" className="text-sm">
                            Pay later ({unpaid.length})
                        </TabsTrigger>
                        <TabsTrigger value="all" className="text-sm">
                            All today ({all.length})
                        </TabsTrigger>
                        <TabsTrigger value="ready" className="text-sm">
                            Ready ({readyOrders.length})
                        </TabsTrigger>
                    </TabsList>

                    <div className="min-h-0 flex-1 overflow-y-auto p-3">
                        {drawer !== 'ready' && (
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Find by order number"
                                inputMode="search"
                                className="mb-2 h-11 text-base"
                            />
                        )}

                        {isPending && <p className="text-muted-foreground py-8 text-center text-base">Loading…</p>}

                        {isError && (
                            <div className="space-y-2 text-center text-base">
                                <p className="text-destructive">Orders could not be loaded.</p>
                                <Button size="sm" variant="outline" onClick={() => refetch()}>
                                    Try again
                                </Button>
                            </div>
                        )}

                        {drawer === 'ready' && (
                            <ReadyList
                                orders={readyOrders}
                                onPay={(orderId) => {
                                    const row = all.find((order) => order.id === orderId);
                                    if (row) {
                                        startPaying(row);
                                    } else {
                                        toast.error('Open the order from All today to take payment.');
                                    }
                                }}
                            />
                        )}

                        {drawer !== 'ready' && !isPending && !isError && rows.length === 0 && (
                            <p className="text-muted-foreground py-8 text-center text-base">
                                {term !== ''
                                    ? 'No order matches that number.'
                                    : drawer === 'unpaid'
                                    ? 'No saved orders waiting for payment.'
                                    : 'No orders taken yet today.'}
                            </p>
                        )}

                        <div className="divide-y">
                            {rows.map((order) => (
                                <div key={order.id} className="flex items-center justify-between gap-2 py-2">
                                    <div className="min-w-0">
                                        <p className="text-base leading-tight font-medium">
                                            {order.order_number} <StatusText order={order} />
                                            <KioskTags order={order} />
                                        </p>
                                        <p className="text-muted-foreground truncate text-sm">
                                            {new Date(order.created_at).toLocaleTimeString('en-PH', {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                            })}{' '}
                                            · {order.items_count} {order.items_count === 1 ? 'item' : 'items'} ·{' '}
                                            {order.type === 'dine_in' ? 'Dine in' : 'Takeout'}
                                            {order.customer_name && ` · ${order.customer_name}`}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <div className="text-right text-base tabular-nums">
                                            <p className="font-medium">{formatPeso(order.total_cents)}</p>
                                            {canPay(order) && order.paid_cents > 0 && (
                                                <p className="text-muted-foreground text-sm">
                                                    {formatPeso(order.balance_cents)} left
                                                </p>
                                            )}
                                        </div>
                                        {canEdit(order) && (
                                            <Button size="sm" variant="outline" className="h-11 px-3 text-base" disabled={edit.isPending} onClick={() => edit.mutate(order.id)}>
                                                Edit
                                            </Button>
                                        )}
                                        {canEdit(order) && (
                                            <Button size="sm" variant="ghost" className="text-destructive h-11 px-3 text-base" onClick={() => setCancelling(order)}>
                                                Cancel
                                            </Button>
                                        )}
                                        {canPay(order) && (
                                            <Button
                                                size="sm"
                                                className="h-11 px-4 text-base"
                                                onClick={() => startPaying(order)}
                                            >
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

            <Dialog open={cancelling !== null} onOpenChange={(open) => !open && !cancel.isPending && setCancelling(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Cancel order {cancelling?.order_number}?</DialogTitle>
                        <DialogDescription>The order is removed from the pay-later list and will not be prepared. Give a reason.</DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-wrap gap-2">
                        {['Customer left', 'Customer changed mind', 'Ordered by mistake'].map((text) => (
                            <Button key={text} size="sm" variant={reason === text ? 'default' : 'outline'} className="h-10 text-sm" onClick={() => setReason(text)}>
                                {text}
                            </Button>
                        ))}
                    </div>
                    <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" maxLength={200} className="h-11 text-base" />

                    <DialogFooter>
                        <Button variant="outline" disabled={cancel.isPending} onClick={() => setCancelling(null)}>
                            Keep order
                        </Button>
                        <Button variant="destructive" disabled={reason.trim().length < 3 || cancel.isPending} onClick={() => cancelling && cancel.mutate(cancelling)}>
                            {cancel.isPending ? 'Cancelling…' : 'Cancel order'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Sheet>
    );
}
