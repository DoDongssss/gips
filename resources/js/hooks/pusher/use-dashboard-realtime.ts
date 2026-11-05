import type Pusher from 'pusher-js';
import { useEffect } from 'react';

import { refreshDashboardLive, refreshDashboardSales } from '@/lib/dashboard/refresh';
import { getEcho } from '@/lib/pusher/echo';
import type { Access } from '@/types/dashboard';

/**
 * Keeps dashboard live blocks fresh via Pusher (no polling). Shares channels with POS/KDS;
 * only removes this page's listeners on unmount.
 */
export function useDashboardRealtime(access: Access, rangeKey: string, onUpdated: () => void): void {
    const needsOrders = access.live || access.shifts;
    const needsKds = access.live;
    const refreshTodaySales = access.sales && rangeKey === 'today';

    useEffect(() => {
        const echo = getEcho();
        if (!echo) {
            return;
        }

        const bumpLive = () => refreshDashboardLive(onUpdated);
        const bumpSales = () => refreshDashboardSales(onUpdated);

        const cleanups: (() => void)[] = [];
        const { connection } = (echo.connector as unknown as { pusher: Pusher }).pusher;

        if (needsOrders) {
            const orders = echo.private('pos.orders');
            const onOrder = () => {
                bumpLive();
                if (refreshTodaySales) {
                    bumpSales();
                }
            };
            orders.listen('.order.updated', onOrder);
            cleanups.push(() => orders.stopListening('.order.updated', onOrder));
        }

        if (needsKds) {
            const kds = echo.private('kds.all');
            kds.listen('.ticket.updated', bumpLive);
            cleanups.push(() => kds.stopListening('.ticket.updated', bumpLive));
        }

        const onReconnect = () => {
            bumpLive();
            if (refreshTodaySales) {
                bumpSales();
            }
        };
        connection.bind('connected', onReconnect);
        cleanups.push(() => connection.unbind('connected', onReconnect));

        return () => cleanups.forEach((fn) => fn());
    }, [needsOrders, needsKds, refreshTodaySales, onUpdated]);
}
