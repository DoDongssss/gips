import { ChefHat, Clock, Wallet } from 'lucide-react';

import { Card, Empty, Pill, Stat } from './card';
import type { Tone } from './card';
import { ago, int, peso, timeOf, words } from './format';
import type { Live, Shifts } from './types';
import { cn } from '@/lib/utils';

const stages: { key: keyof Live['pipeline']; label: string; bar: string }[] = [
    { key: 'open', label: 'Open', bar: 'bg-slate-400' },
    { key: 'confirmed', label: 'Confirmed', bar: 'bg-blue-500' },
    { key: 'preparing', label: 'Preparing', bar: 'bg-amber-500' },
    { key: 'ready', label: 'Ready', bar: 'bg-green-500' },
];

/** Right-now numbers: orders in progress, the kitchen queue and what is still unpaid. */
export function LiveStrip({ live }: { live: Live }) {
    const total = Object.values(live.pipeline).reduce((a, b) => a + b, 0);
    const wait = live.kitchen.oldest_minutes;
    const waitTone = wait === null ? undefined : wait >= 15 ? 'danger' : wait >= 8 ? 'warning' : 'good';

    return (
        <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Orders in progress" hint="Today, not yet completed" className="lg:col-span-1">
                <p className="text-2xl font-semibold tabular-nums">{int(total)}</p>
                <div className="bg-muted mt-3 flex h-2 overflow-hidden rounded-full">
                    {stages.map((s) => (live.pipeline[s.key] > 0 ? <div key={s.key} className={s.bar} style={{ width: `${(live.pipeline[s.key] / total) * 100}%` }} /> : null))}
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    {stages.map((s) => (
                        <li key={s.key} className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2"><span className={cn('size-2.5 rounded-sm', s.bar)} />{s.label}</span>
                            <span className="tabular-nums">{live.pipeline[s.key]}</span>
                        </li>
                    ))}
                </ul>
            </Card>

            <Card title="Kitchen queue" hint="Tickets waiting or being made" action={<ChefHat className="text-muted-foreground size-4" />}>
                <div className="grid grid-cols-2 gap-4">
                    <Stat label="Tickets" value={int(live.kitchen.tickets)} />
                    <Stat label="Longest wait" value={wait === null ? '—' : `${wait} min`} tone={waitTone} />
                </div>
                {live.kitchen.stations.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm">
                        {live.kitchen.stations.map((s) => (
                            <li key={s.name} className="flex justify-between"><span>{s.name}</span><span className="tabular-nums">{s.count}</span></li>
                        ))}
                    </ul>
                )}
            </Card>

            <Card title="Waiting for payment" hint="Today's unpaid or part-paid orders" action={<Wallet className="text-muted-foreground size-4" />}>
                <div className="grid grid-cols-2 gap-4">
                    <Stat label="Orders" value={int(live.unpaid.count)} tone={live.unpaid.count > 0 ? 'warning' : undefined} />
                    <Stat label="Still due" value={peso(live.unpaid.due_cents)} />
                </div>
            </Card>
        </div>
    );
}

const statusTone: Record<string, Tone> = { open: 'neutral', confirmed: 'info', preparing: 'warning', ready: 'good', completed: 'good', cancelled: 'danger', voided: 'danger' };
const payTone: Record<string, Tone> = { paid: 'good', partial: 'warning', unpaid: 'neutral', refunded: 'danger' };

export function RecentOrders({ live, now }: { live: Live; now: number }) {
    return (
        <Card title="Latest orders" hint="Today" className="lg:col-span-2">
            {live.recent.length === 0 ? (
                <Empty>No orders yet today.</Empty>
            ) : (
                <div className="-mx-4 overflow-x-auto px-4">
                    <table className="w-full text-sm">
                        <thead className="text-muted-foreground text-left text-xs">
                            <tr>
                                <th className="pb-2 font-medium">Order</th>
                                <th className="pb-2 font-medium">Items</th>
                                <th className="pb-2 font-medium">Status</th>
                                <th className="pb-2 text-right font-medium">Total</th>
                                <th className="pb-2 pl-3 text-right font-medium">When</th>
                            </tr>
                        </thead>
                        <tbody className="divide-border divide-y">
                            {live.recent.map((o) => (
                                <tr key={o.id}>
                                    <td className="py-2 pr-3">
                                        <p className="font-medium">{o.number}</p>
                                        <p className="text-muted-foreground text-xs">{words(o.channel)} · {words(o.type)}{o.customer ? ` · ${o.customer}` : ''}</p>
                                    </td>
                                    <td className="py-2 pr-3 tabular-nums">{o.items}</td>
                                    <td className="py-2 pr-3">
                                        <div className="flex flex-wrap gap-1">
                                            <Pill tone={statusTone[o.status] ?? 'neutral'}>{words(o.status)}</Pill>
                                            <Pill tone={payTone[o.payment_status] ?? 'neutral'}>{words(o.payment_status)}</Pill>
                                        </div>
                                    </td>
                                    <td className="py-2 text-right font-medium tabular-nums">{peso(o.total_cents)}</td>
                                    <td className="text-muted-foreground py-2 pl-3 text-right text-xs whitespace-nowrap">{ago(o.at, now)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}

export function ShiftsCard({ shifts, mine }: { shifts: Shifts; mine: boolean }) {
    return (
        <Card title={mine ? 'My shift' : 'Cash drawers'} hint="Estimated cash in each open drawer" action={<Clock className="text-muted-foreground size-4" />}>
            {shifts.open.length === 0 ? (
                <Empty>No shift is open.</Empty>
            ) : (
                <ul className="space-y-4">
                    {shifts.open.map((s) => (
                        <li key={s.id} className="rounded-lg border p-3">
                            <div className="flex items-baseline justify-between gap-2">
                                <p className="font-medium">{s.cashier}</p>
                                <p className="text-muted-foreground text-xs">since {timeOf(s.opened_at)}</p>
                            </div>
                            <p className="mt-1 text-xl font-semibold tabular-nums">{peso(s.expected_cents)}</p>
                            <dl className="text-muted-foreground mt-2 space-y-0.5 text-xs">
                                <Line label="Opening cash" value={peso(s.opening_cents)} />
                                <Line label="Cash sales" value={`+ ${peso(s.cash_sales_cents)}`} />
                                {s.cash_in_cents > 0 && <Line label="Cash in" value={`+ ${peso(s.cash_in_cents)}`} />}
                                {s.cash_out_cents > 0 && <Line label="Paid out and drops" value={`− ${peso(s.cash_out_cents)}`} />}
                            </dl>
                        </li>
                    ))}
                </ul>
            )}

            {shifts.closed_today.length > 0 && (
                <div className="mt-4">
                    <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">Closed today</p>
                    <ul className="space-y-1 text-sm">
                        {shifts.closed_today.map((s) => (
                            <li key={s.id} className="flex items-center justify-between gap-2">
                                <span className="truncate">{s.cashier}</span>
                                {s.variance_cents === null ? (
                                    <span className="text-muted-foreground text-xs">no count</span>
                                ) : s.variance_cents === 0 ? (
                                    <Pill tone="good">Balanced</Pill>
                                ) : (
                                    <Pill tone={s.variance_cents < 0 ? 'danger' : 'warning'}>{s.variance_cents < 0 ? 'Short' : 'Over'} {peso(Math.abs(s.variance_cents))}</Pill>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Card>
    );
}

function Line({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between"><dt>{label}</dt><dd className="tabular-nums">{value}</dd></div>
    );
}
