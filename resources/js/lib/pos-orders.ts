import { api } from '@/lib/api';
import type { PosOrderRow } from '@/lib/pos-session';
import type { OrderDetail, OrderType, PaymentStatus } from '@/pages/orders/types';

const BASE = '/api/v1';

/** An order the kitchen finished, waiting for the customer (GET /pos/ready-orders). */
export type ReadyOrder = {
    id: number;
    order_number: string;
    customer_name: string | null;
    type: OrderType;
    payment_status: PaymentStatus;
    balance_cents: number;
    items_count: number;
    ready_at: string | null;
};

export const readyOrdersQuery = {
    queryKey: ['pos', 'ready-orders'] as const,
    queryFn: async (): Promise<ReadyOrder[]> => (await api<{ data: ReadyOrder[] }>(`${BASE}/pos/ready-orders`)).data,
    refetchInterval: 30_000,
};

export async function fetchOrder(id: number): Promise<OrderDetail> {
    return (await api<{ data: OrderDetail }>(`${BASE}/orders/${id}`)).data;
}

/** Orders that still owe money and are not dead. */
export const isUnpaid = (order: PosOrderRow): boolean => !['cancelled', 'voided'].includes(order.status) && order.balance_cents > 0;
