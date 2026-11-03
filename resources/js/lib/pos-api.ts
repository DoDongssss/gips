import { api } from '@/lib/api';
import type { XReport } from '@/lib/reports';
import type { OrderDetail, PosConfig } from '@/pages/orders/types';
import { normalizeMenu } from '@/pages/pos/menu-adapter';
import type { MenuCategory, PricedSummary } from '@/pages/pos/types';
import { uuid } from '@/lib/uuid';

/**
 * Every call the register and the order pages make to /api/v1.
 * Plain URLs on purpose: the API routes are not Inertia pages, and one file keeps them easy to find.
 */
const BASE = '/api/v1';

export type Approval = { user_id: number; pin: string };

export type CartPayload = {
    type: 'dine_in' | 'takeout';
    customer_name: string | null;
    notes: string | null;
    items: { product_id: number; variant_id: number | null; quantity: number; modifiers: number[]; notes: string | null }[];
    discounts: { discount_id: number; id_number: string | null; item_index: number | null }[];
    approval?: Approval;
};

export type PaymentInput = {
    method: string;
    amount_cents?: number;
    tendered_cents?: number;
    tip_cents?: number;
    reference_no?: string;
};

/** A new key for one attempt. Reuse the SAME key when retrying the same request. */
export const newIdempotencyKey = (): string => uuid();

export const menuQuery = {
    queryKey: ['pos', 'menu'] as const,
    queryFn: async (): Promise<MenuCategory[]> => normalizeMenu(await api<unknown>(`${BASE}/menu`)),
    staleTime: 60_000,
};

export const configQuery = {
    queryKey: ['pos', 'config'] as const,
    queryFn: async (): Promise<PosConfig> => (await api<{ data: PosConfig }>(`${BASE}/pos/config`)).data,
    staleTime: 60_000,
};

export async function previewOrder(payload: CartPayload): Promise<PricedSummary> {
    return (await api<{ data: PricedSummary }>(`${BASE}/orders/preview`, { method: 'POST', body: payload })).data;
}

export async function createOrder(payload: CartPayload, key: string): Promise<OrderDetail> {
    return (
        await api<{ data: OrderDetail }>(`${BASE}/orders`, {
            method: 'POST',
            body: payload,
            headers: { 'Idempotency-Key': key },
        })
    ).data;
}

export async function takePayments(orderId: number, payments: PaymentInput[], key: string): Promise<OrderDetail> {
    return (
        await api<{ data: OrderDetail }>(`${BASE}/orders/${orderId}/payments`, {
            method: 'POST',
            body: { payments },
            headers: { 'Idempotency-Key': key },
        })
    ).data;
}

export type OrderAction = 'confirm' | 'complete' | 'cancel' | 'void';

export async function orderAction(
    orderId: number,
    action: OrderAction,
    body?: { reason: string; approval?: Approval },
): Promise<OrderDetail> {
    return (await api<{ data: OrderDetail }>(`${BASE}/orders/${orderId}/${action}`, { method: 'POST', body: body ?? {} })).data;
}

export async function refundPayment(
    orderId: number,
    body: { payment_id: number; amount_cents: number; reason: string; approval?: Approval },
    key: string,
): Promise<OrderDetail> {
    return (
        await api<{ data: OrderDetail }>(`${BASE}/orders/${orderId}/refunds`, {
            method: 'POST',
            body,
            headers: { 'Idempotency-Key': key },
        })
    ).data;
}

export async function makeXReport(scope: 'shift' | 'day'): Promise<XReport> {
    return (await api<{ data: XReport }>(`${BASE}/reports/x`, { method: 'POST', body: { scope } })).data;
}
