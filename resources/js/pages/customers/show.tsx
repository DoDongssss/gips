import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

import { Can } from '@/components/shared/can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPeso } from '@/lib/money';
import AdjustLoyaltyDialog from '@/pages/customers/adjust-loyalty-dialog';
import CustomerFormDialog from '@/pages/customers/form-dialog';
import { index } from '@/routes/customers';
import { show as orderShow } from '@/routes/orders';

type CustomerDetail = {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    loyalty_points: number;
    orders_count: number;
    created_at: string | null;
};

type OrderRow = {
    id: number;
    order_number: string;
    business_date: string | null;
    total_cents: number;
    payment_status: string;
    loyalty_points_redeemed: number;
    loyalty_points_awarded: boolean;
};

type LedgerRow = {
    id: number;
    type: string;
    points: number;
    balance_after: number;
    note: string | null;
    order_number: string | null;
    user_name: string | null;
    created_at: string | null;
};

type Props = {
    customer: CustomerDetail;
    orders: OrderRow[];
    ledger: LedgerRow[];
};

const formatDateTime = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');

const typeLabel: Record<string, string> = {
    earned: 'Earned',
    redeemed: 'Redeemed',
    adjusted: 'Adjusted',
    reversed: 'Reversed',
};

export default function CustomerShow({ customer, orders, ledger }: Props) {
    const [editOpen, setEditOpen] = useState(false);
    const [adjustOpen, setAdjustOpen] = useState(false);

    return (
        <>
            <Head title={customer.name} />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight">{customer.name}</h1>
                            <Badge variant="secondary" className="tabular-nums">
                                {customer.loyalty_points} points
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {[customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact details'}
                        </p>
                        <p className="text-muted-foreground text-sm">
                            {customer.orders_count} order(s) · joined {formatDateTime(customer.created_at)}
                        </p>
                        {customer.notes && <p className="text-muted-foreground text-sm">{customer.notes}</p>}
                    </div>

                    <Can permission="customer.manage">
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setAdjustOpen(true)}>
                                Adjust points
                            </Button>
                            <Button variant="outline" onClick={() => setEditOpen(true)}>
                                Edit customer
                            </Button>
                        </div>
                    </Can>
                </div>

                <section className="space-y-3">
                    <h2 className="font-semibold">Recent orders</h2>
                    <div className="overflow-hidden rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Order</th>
                                    <th className="px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 text-right font-medium">Total</th>
                                    <th className="px-4 py-3 font-medium">Payment</th>
                                    <th className="px-4 py-3 text-right font-medium">Loyalty</th>
                                    <th className="px-4 py-3 text-right font-medium" />
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-muted-foreground px-4 py-8 text-center">
                                            No orders linked yet.
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((order) => (
                                        <tr key={order.id} className="border-t">
                                            <td className="px-4 py-3 font-medium">{order.order_number}</td>
                                            <td className="text-muted-foreground px-4 py-3">{order.business_date ?? '—'}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">{formatPeso(order.total_cents)}</td>
                                            <td className="text-muted-foreground px-4 py-3 capitalize">{order.payment_status.replace(/_/g, ' ')}</td>
                                            <td className="text-muted-foreground px-4 py-3 text-right text-xs">
                                                {order.loyalty_points_redeemed > 0 && <div>Redeemed {order.loyalty_points_redeemed} pt</div>}
                                                {order.loyalty_points_awarded && <div>Points awarded</div>}
                                                {order.loyalty_points_redeemed === 0 && !order.loyalty_points_awarded && '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={orderShow.url(order.id)}>Open</Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="font-semibold">Points history</h2>
                    <div className="overflow-hidden rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left">
                                <tr>
                                    <th className="px-4 py-3 font-medium">When</th>
                                    <th className="px-4 py-3 font-medium">Type</th>
                                    <th className="px-4 py-3 text-right font-medium">Change</th>
                                    <th className="px-4 py-3 text-right font-medium">Balance</th>
                                    <th className="px-4 py-3 font-medium">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">
                                            No point activity yet.
                                        </td>
                                    </tr>
                                ) : (
                                    ledger.map((row) => (
                                        <tr key={row.id} className="border-t">
                                            <td className="text-muted-foreground px-4 py-3">{formatDateTime(row.created_at)}</td>
                                            <td className="px-4 py-3">{typeLabel[row.type] ?? row.type}</td>
                                            <td className={`px-4 py-3 text-right tabular-nums ${row.points >= 0 ? 'text-emerald-700' : 'text-destructive'}`}>
                                                {row.points >= 0 ? `+${row.points}` : row.points}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">{row.balance_after}</td>
                                            <td className="text-muted-foreground px-4 py-3 text-xs">
                                                {[row.note, row.order_number ? `#${row.order_number}` : null, row.user_name].filter(Boolean).join(' · ')}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} />
            <AdjustLoyaltyDialog open={adjustOpen} onOpenChange={setAdjustOpen} customer={customer} />
        </>
    );
}

CustomerShow.layout = {
    breadcrumbs: [
        { title: 'Customers', href: index() },
        { title: 'Profile', href: index() },
    ],
};
