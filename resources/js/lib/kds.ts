import { queryOptions } from '@tanstack/react-query';

import { posGet, posPost } from '@/lib/pos-http';

export type KdsItem = {
    id: number;
    name: string;
    quantity: number;
    modifiers_summary: string | null;
    notes: string | null;
    status: 'new' | 'preparing' | 'ready' | 'bumped';
};

export type KdsTicket = {
    id: number;
    ticket_number: number;
    status: 'new' | 'preparing' | 'ready' | 'bumped' | 'cancelled';
    priority: number;
    fired_at: string | null;
    order: { id: number; order_number: string; type: string; customer_name: string | null; notes: string | null };
    items: KdsItem[];
};

export type KdsBoard = {
    station: { id: number; name: string; type: string };
    thresholds: { warning_minutes: number; late_minutes: number };
    server_time: string;
    can_recall: boolean;
    tickets: KdsTicket[];
};

export type ReadyOrder = {
    id: number;
    order_number: string;
    customer_name: string | null;
    type: string;
    payment_status: string;
    balance_cents: number;
    items_count: number;
    ready_at: string | null;
};

/** The realtime channel is the fast path; this poll is the fallback when it is down. */
export const KDS_POLL_MS = 5_000;

/**
 * Calls for one kitchen screen. Signed-in staff use their session; a paired kitchen
 * screen passes its token and only ever reaches its own station.
 */
export function kdsClient(stationId: number, token?: string) {
    const base = token ? '/api/v1/device/kds' : '/api/v1/kds';
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    return {
        boardQuery: queryOptions({
            queryKey: ['kds', 'board', stationId, token ? 'device' : 'staff'],
            queryFn: async () =>
                (
                    await posGet<{ data: KdsBoard }>(
                        token ? `${base}/tickets` : `${base}/stations/${stationId}/tickets`,
                        headers,
                    )
                ).data,
            refetchInterval: KDS_POLL_MS,
            staleTime: 0,
        }),
        start: (ticketId: number) => posPost(`${base}/tickets/${ticketId}/start`, {}, undefined, headers),
        bumpTicket: (ticketId: number) => posPost(`${base}/tickets/${ticketId}/bump`, {}, undefined, headers),
        bumpItem: (itemId: number) => posPost(`${base}/items/${itemId}/bump`, {}, undefined, headers),
        recall: () =>
            posPost(token ? `${base}/recall` : `${base}/stations/${stationId}/recall`, {}, undefined, headers),
    };
}
export const readyOrdersQuery = () =>
    queryOptions({
        queryKey: ['pos', 'ready-orders'],
        queryFn: async () => (await posGet<{ data: ReadyOrder[] }>('/api/v1/pos/ready-orders')).data,
        refetchInterval: KDS_POLL_MS,
        staleTime: 0,
    });

export const completeOrder = (orderId: number) => posPost(`/api/v1/orders/${orderId}/complete`, {});
