import { Badge } from '@/components/ui/badge';
import type { OrderStatus, OrderType, PaymentStatus } from '@/pages/orders/types';

/** One tone per meaning: green = done/paid, amber = needs attention, red = lost/returned, blue = in progress. */
const tone = {
    green: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    amber: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    red: 'border-transparent bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
    blue: 'border-transparent bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
    gray: 'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
} as const;

const statusTone: Record<OrderStatus, keyof typeof tone> = {
    open: 'gray',
    confirmed: 'blue',
    preparing: 'blue',
    ready: 'green',
    completed: 'green',
    cancelled: 'gray',
    voided: 'red',
};

const paymentTone: Record<PaymentStatus, keyof typeof tone> = {
    unpaid: 'amber',
    partial: 'amber',
    paid: 'green',
    refunded: 'red',
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
    return <Badge variant="outline" className={tone[statusTone[status] ?? 'gray']}>{humanize(status)}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
    return <Badge variant="outline" className={tone[paymentTone[status] ?? 'gray']}>{humanize(status)}</Badge>;
}
