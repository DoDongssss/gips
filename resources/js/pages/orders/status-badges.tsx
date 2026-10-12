import { Badge } from '@/components/ui/badge';
import type { OrderStatus, OrderType, PaymentStatus } from '@/pages/orders/types';

type Variant = 'default' | 'secondary' | 'destructive' | 'outline';

const statusVariant: Record<OrderStatus, Variant> = {
    open: 'outline',
    confirmed: 'secondary',
    preparing: 'secondary',
    ready: 'default',
    completed: 'default',
    cancelled: 'secondary',
    voided: 'destructive',
};

const paymentVariant: Record<PaymentStatus, Variant> = {
    unpaid: 'outline',
    partial: 'secondary',
    paid: 'default',
    refunded: 'destructive',
};

export function humanize(value: string): string {
    const text = value.replace(/[_-]+/g, ' ').trim();

    return text.charAt(0).toUpperCase() + text.slice(1);
}

export const orderTypeLabel: Record<OrderType, string> = {
    dine_in: 'Dine in',
    takeout: 'Takeout',
    delivery: 'Delivery',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
    return <Badge variant={statusVariant[status] ?? 'outline'}>{humanize(status)}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
    return <Badge variant={paymentVariant[status] ?? 'outline'}>{humanize(status)}</Badge>;
}
