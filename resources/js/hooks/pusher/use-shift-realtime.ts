import type Pusher from 'pusher-js';
import { useEffect } from 'react';

import { getEcho } from '@/lib/pusher/echo';
import { router } from '@inertiajs/react';

const ONLY = ['current', 'open_shifts'] as const;

/** Refresh open shift totals when orders or payments change. */
export function useShiftRealtime(enabled: boolean): void {
    useEffect(() => {
        if (!enabled) {
            return;
        }

        const echo = getEcho();
        if (!echo) {
            return;
        }

        let timer: number | undefined;

        const reload = () => {
            if (window.location.pathname !== '/shifts') {
                return;
            }

            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                router.reload({ only: [...ONLY] });
            }, 800);
        };

        const orders = echo.private('pos.orders');
        orders.listen('.order.updated', reload);

        const { connection } = (echo.connector as unknown as { pusher: Pusher }).pusher;
        connection.bind('connected', reload);

        return () => {
            orders.stopListening('.order.updated', reload);
            connection.unbind('connected', reload);
            window.clearTimeout(timer);
        };
    }, [enabled]);
}
