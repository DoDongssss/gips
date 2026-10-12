import { queryOptions } from '@tanstack/react-query';

import { posGet, posPost } from '@/lib/pos-http';
import type { OrderDetail } from '@/pages/orders/types';

export type PosOrderRow = {
    id: number;
    order_number: string;
    status: string;
    payment_status: string;
    type: string;
    customer_name: string | null;
    total_cents: number;
    paid_cents: number;
    balance_cents: number;
    items_count: number;
    created_at: string;
};

export type PosSessionData = {
    summary: { since: string | null; sales_count: number; sales_cents: number; unpaid_count: number; unpaid_cents: number };
    orders: PosOrderRow[];
};

export type PayRow = { method: string; amount_cents?: number; tendered_cents?: number; reference_no?: string };

const STORAGE_KEY = 'pos.session.started_at';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Stand-in for a real shift until Phase 5: "since" is when the cashier opened the register.
 * When shifts arrive, return the shift's opened_at here instead.
 */
export function readSessionStart(): string {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored && Date.now() - new Date(stored).getTime() < MAX_AGE_MS) {
            return stored;
        }
    } catch {
        // storage unavailable: fall through to a fresh start
    }

    return writeSessionStart();
}

export function writeSessionStart(): string {
    const now = new Date().toISOString();

    try {
        localStorage.setItem(STORAGE_KEY, now);
    } catch {
        // ignore
    }

    return now;
}

export const myOrdersQuery = (since: string) =>
    queryOptions({
        queryKey: ['pos', 'my-orders', since],
        queryFn: async () => (await posGet<{ data: PosSessionData }>(`/api/v1/pos/my-orders?since=${encodeURIComponent(since)}`)).data,
        refetchInterval: 30_000,
        staleTime: 10_000,
    });

export async function payOrder(orderId: number, payments: PayRow[], idempotencyKey: string): Promise<OrderDetail> {
    const response = await posPost<{ data: OrderDetail }>(`/api/v1/orders/${orderId}/payments`, { payments }, idempotencyKey);

    return response.data;
}
