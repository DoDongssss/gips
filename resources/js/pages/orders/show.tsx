import { Head, Link, router } from '@inertiajs/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { errorMessages } from '@/lib/api';
import { formatPeso } from '@/lib/money';
import { configQuery, orderAction } from '@/lib/pos-api';
import type { OrderAction } from '@/lib/pos-api';
import { ActionDialog } from '@/pages/orders/action-dialog';
import { PaymentDialog } from '@/pages/orders/payment-dialog';
import { ReceiptDialog } from '@/pages/orders/receipt-dialog';
import { humanize, OrderStatusBadge, orderTypeLabel, PaymentStatusBadge } from '@/pages/orders/status-badges';
import type { Approver, OrderDetail, OrderReceipt } from '@/pages/orders/types';
import { index } from '@/routes/orders';

type Props = {
    order: OrderDetail;
    /** Managers who can approve a void with their PIN. */
    approvers: Approver[];
};

const formatDateTime = (value: string | null): string => (value ? new Date(value).toLocaleString() : '—');

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3 rounded-lg border p-4">
            <h2 className="text-sm font-semibold">{title}</h2>
            {children}
        </section>
    );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className={`flex justify-between text-sm ${strong ? 'text-base font-semibold' : ''}`}>
            <span className={strong ? '' : 'text-muted-foreground'}>{label}</span>
            <span>{value}</span>
        </div>
    );
}

export default function Show({ order, approvers }: Props) {
    const { can } = useCan();
    const [paying, setPaying] = useState(false);
    const [dialog, setDialog] = useState<'cancel' | 'void' | null>(null);
    const [receipt, setReceipt] = useState<OrderReceipt | null>(null);

    // Payment methods come from the same config call the register uses.
    const config = useQuery({ ...configQuery, enabled: can('payment.take') });

    const items = order.items ?? [];
    const payments = order.payments ?? [];
    const receipts = order.receipts ?? [];
    const history = order.status_history ?? [];

    const acceptsPayment = ['open', 'confirmed', 'preparing', 'ready'].includes(order.status);
    const canPay = can('payment.take') && acceptsPayment && order.balance_cents > 0;
    const canCancel = can('order.update') && order.payment_status === 'unpaid' && ['open', 'confirmed', 'preparing'].includes(order.status);
    const canVoid = ['confirmed', 'preparing', 'ready', 'completed'].includes(order.status);

    function refresh() {
        router.reload({ only: ['order'] });
    }

    const step = useMutation({
        mutationFn: (action: OrderAction) => orderAction(order.id, action),
        onSuccess: (updated) => {
            toast.success(`Order ${updated.order_number} is now ${humanize(updated.status).toLowerCase()}.`);
            refresh();
        },
        onError: (error) => toast.error(errorMessages(error)[0]),
    });

    return (
        <>
            <Head title={`Order ${order.order_number}`} />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-xl font-semibold tracking-tight">Order {order.order_number}</h1>
                            <OrderStatusBadge status={order.status} />
                            <PaymentStatusBadge status={order.payment_status} />
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {orderTypeLabel[order.type] ?? order.type} · {humanize(order.channel)} · {formatDateTime(order.created_at)}
                            {order.customer_name && ` · ${order.customer_name}`}
                        </p>
                        {order.cancel_reason && <p className="text-sm">Reason: {order.cancel_reason}</p>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {canPay && (
                            <Button onClick={() => setPaying(true)} disabled={!config.data}>
                                Take payment · {formatPeso(order.balance_cents)}
                            </Button>
                        )}

                        <Can permission="order.update">
                            {order.status === 'open' && (
                                <Button variant="outline" disabled={step.isPending} onClick={() => step.mutate('confirm')}>
                                    Send to kitchen
                                </Button>
                            )}
                            {order.status === 'ready' && (
                                <Button variant="outline" disabled={step.isPending} onClick={() => step.mutate('complete')}>
                                    Mark completed
                                </Button>
                            )}
                        </Can>

                        {canCancel && (
                            <Button variant="outline" className="text-destructive" onClick={() => setDialog('cancel')}>
                                Cancel order
                            </Button>
                        )}
                        {canVoid && (
                            <Button variant="outline" className="text-destructive" onClick={() => setDialog('void')}>
                                Void order
                            </Button>
                        )}

                        <Button variant="ghost" asChild>
                            <Link href={index.url({ query: { date: order.business_date } })}>Back to orders</Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="space-y-6">
                        <Section title="Items">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-muted-foreground text-left">
                                        <tr>
                                            <th className="py-1.5 pr-3 font-medium">Item</th>
                                            <th className="px-3 py-1.5 text-right font-medium">Price</th>
                                            <th className="px-3 py-1.5 text-right font-medium">Qty</th>
                                            <th className="py-1.5 pl-3 text-right font-medium">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {items.map((item) => (
                                            <tr key={item.id} className={item.status === 'voided' ? 'text-muted-foreground line-through' : ''}>
                                                <td className="py-2 pr-3 align-top">
                                                    <p className="font-medium">
                                                        {item.product_name}
                                                        {item.variant_name && <span className="text-muted-foreground font-normal"> · {item.variant_name}</span>}
                                                    </p>
                                                    {item.modifiers.map((m, i) => (
                                                        <p key={i} className="text-muted-foreground text-xs">
                                                            + {m.modifier_name}
                                                            {m.price_delta_cents !== 0 && ` (${formatPeso(m.price_delta_cents)})`}
                                                        </p>
                                                    ))}
                                                    {item.notes && <p className="text-muted-foreground text-xs italic">“{item.notes}”</p>}
                                                    {item.discount_cents > 0 && (
                                                        <p className="text-muted-foreground text-xs">Discount −{formatPeso(item.discount_cents)}</p>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right align-top">{formatPeso(item.unit_price_cents + item.modifiers_total_cents)}</td>
                                                <td className="px-3 py-2 text-right align-top">{item.quantity}</td>
                                                <td className="py-2 pl-3 text-right align-top font-medium">{formatPeso(item.line_total_cents)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="space-y-1 border-t pt-3">
                                <Line label="Subtotal" value={formatPeso(order.subtotal_cents)} />
                                {(order.discounts ?? []).map((d, i) => (
                                    <Line
                                        key={i}
                                        label={`${d.name}${d.id_number ? ` (${d.id_number})` : ''}`}
                                        value={`−${formatPeso(d.amount_cents)}`}
                                    />
                                ))}
                                {(order.taxes ?? []).map((t, i) => (
                                    <Line
                                        key={i}
                                        label={`${t.name} ${Number(t.rate)}%${t.is_inclusive ? ' (included)' : ''}`}
                                        value={formatPeso(t.tax_cents)}
                                    />
                                ))}
                                <Line label="Total" value={formatPeso(order.total_cents)} strong />
                                <Line label="Paid" value={formatPeso(order.paid_cents)} />
                                {order.balance_cents > 0 && <Line label="Balance due" value={formatPeso(order.balance_cents)} />}
                                {order.tip_cents > 0 && <Line label="Tips (not in total)" value={formatPeso(order.tip_cents)} />}
                            </div>
                        </Section>

                        {order.notes && (
                            <Section title="Order note">
                                <p className="text-sm">{order.notes}</p>
                            </Section>
                        )}
                    </div>

                    <div className="space-y-6">
                        <Section title="Payments">
                            {payments.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No payments yet.</p>
                            ) : (
                                <ul className="divide-y">
                                    {payments.map((payment) => (
                                        <li key={payment.id} className="space-y-0.5 py-2 text-sm first:pt-0 last:pb-0">
                                            <div className="flex justify-between">
                                                <span className="font-medium">
                                                    {payment.method ?? 'Payment'}
                                                    {payment.status !== 'completed' && (
                                                        <span className="text-destructive"> · {humanize(payment.status)}</span>
                                                    )}
                                                </span>
                                                <span>{formatPeso(payment.amount_cents)}</span>
                                            </div>
                                            <p className="text-muted-foreground text-xs">
                                                {formatDateTime(payment.paid_at)}
                                                {payment.reference_no && ` · Ref ${payment.reference_no}`}
                                                {payment.tendered_cents ? ` · received ${formatPeso(payment.tendered_cents)}, change ${formatPeso(payment.change_cents)}` : ''}
                                                {payment.tip_cents > 0 && ` · tip ${formatPeso(payment.tip_cents)}`}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>

                        <Section title="Receipts">
                            {receipts.length === 0 ? (
                                <p className="text-muted-foreground text-sm">A receipt is issued once the order is fully paid.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {receipts.map((r) => (
                                        <li key={r.id} className="flex items-center justify-between text-sm">
                                            <span>
                                                {r.receipt_number}
                                                <span className="text-muted-foreground"> · {humanize(r.type)} · printed {r.printed_count}×</span>
                                            </span>
                                            <Button size="sm" variant="outline" onClick={() => setReceipt(r)}>
                                                View
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>

                        <Section title="History">
                            <ol className="space-y-3">
                                {history.map((entry, i) => (
                                    <li key={i} className="text-sm">
                                        <p className="font-medium">
                                            {entry.from ? `${humanize(entry.from)} → ` : ''}
                                            {humanize(entry.to)}
                                        </p>
                                        <p className="text-muted-foreground text-xs">
                                            {formatDateTime(entry.at)}
                                            {entry.note && ` · ${entry.note}`}
                                        </p>
                                    </li>
                                ))}
                            </ol>
                        </Section>
                    </div>
                </div>
            </div>

            <PaymentDialog
                order={paying ? order : null}
                methods={config.data?.payment_methods ?? []}
                onClose={(updated) => {
                    setPaying(false);

                    if (updated) {
                        refresh();
                    }
                }}
            />

            <ActionDialog
                mode={dialog}
                order={order}
                approvers={approvers}
                needsApproval={!can('order.void')}
                onClose={() => setDialog(null)}
                onDone={(updated) => {
                    toast.success(`Order ${updated.order_number} ${humanize(updated.status).toLowerCase()}.`);
                    setDialog(null);
                    refresh();
                }}
            />

            <ReceiptDialog orderId={order.id} receipt={receipt} onOpenChange={(open) => !open && setReceipt(null)} />
        </>
    );
}

Show.layout = {
    breadcrumbs: [{ title: 'Orders', href: index() }],
};
