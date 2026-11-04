import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAlertChannel } from '@/hooks/use-alert-channel';
import { useCan } from '@/hooks/use-can';
import { refreshDashboardAlerts } from '@/lib/dashboard-refresh';
import { posGet } from '@/lib/pos-http';
import type { LowStock } from '@/types/inventory';

export type Alerts = {
    devices?: { count: number; items: { id: number; name: string; type: string; last_seen_at: string | null; minutes: number }[] };
    printers?: { count: number; items: { id: number; name: string; message: string | null; connection: string | null; minutes: number }[] };
    stock?: LowStock;
};

export const ALERTS_KEY = ['alerts'];
const ALERTS_URL = '/api/v1/pos/alerts';

let timer: number | undefined;

/** Several bells hear the same push: collapse them into one fetch and one dashboard reload. */
function scheduleRefresh(queryClient: QueryClient) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ALERTS_KEY });
        refreshDashboardAlerts();
    }, 300);
}

/**
 * All alerts (offline devices, broken printers, low stock) from ONE request, shared by every bell.
 * A Pusher push refreshes it. Polls every 30 seconds only when Pusher is not configured.
 * `select` picks the part a bell needs.
 */
export function useAlerts<T>(select: (alerts: Alerts) => T) {
    const { can } = useCan();
    const canDevices = can('device.manage');
    const canStock = can('inventory.view');
    const queryClient = useQueryClient();

    const onChange = () => scheduleRefresh(queryClient);
    const liveDevices = useAlertChannel('device-alerts', canDevices, onChange);
    const liveStock = useAlertChannel('stock-alerts', canStock, onChange);
    const live = liveDevices || liveStock;

    return useQuery({
        queryKey: ALERTS_KEY,
        queryFn: async () => (await posGet<{ data: Alerts }>(ALERTS_URL)).data,
        enabled: canDevices || canStock,
        staleTime: 10_000,
        refetchInterval: live ? false : 30_000,
        select,
    });
}
