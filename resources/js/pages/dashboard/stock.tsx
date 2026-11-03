import { Link } from '@inertiajs/react';
import { Monitor } from 'lucide-react';

import { Card, Empty, Pill, Stat } from './card';
import { ago, int, peso, words } from './format';
import type { InventoryStats, Kiosk, Purchasing, Range } from './types';
import { cn } from '@/lib/utils';
import { index as ingredientsIndex } from '@/routes/inventory/ingredients';

function qty(value: string): string {
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function StockCard({ stock }: { stock: InventoryStats }) {
    return (
        <Card
            title="Stock"
            hint="Ingredients on hand"
            action={
                stock.low.count > 0 ? (
                    <Link href={ingredientsIndex.url({ query: { filter: 'low' } })} className="text-primary text-xs hover:underline">See all {stock.low.count}</Link>
                ) : undefined
            }
        >
            <div className="grid grid-cols-3 gap-4">
                <Stat label="Stock value" value={peso(stock.stock_value_cents, false)} />
                <Stat label="Low" value={int(stock.low.count)} tone={stock.low.count > 0 ? 'warning' : 'good'} />
                <Stat label="Negative" value={int(stock.negative_count)} tone={stock.negative_count > 0 ? 'danger' : undefined} />
            </div>

            {stock.count_in_progress && <p className="mt-3"><Pill tone="info">A stock count is in progress</Pill></p>}

            <div className="mt-4 flex-1">
                {stock.low.count === 0 ? (
                    <p className="text-muted-foreground text-sm">Nothing to reorder right now.</p>
                ) : (
                    <ul className="space-y-1.5">
                        {stock.low.items.map((i) => (
                            <li key={i.id} className="flex items-center justify-between gap-3 text-sm">
                                <span className="truncate">{i.name}</span>
                                <span className={cn('shrink-0 tabular-nums', i.is_negative ? 'font-medium text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400')}>
                                    {qty(i.quantity)} {i.unit}
                                    <span className="text-muted-foreground"> / {qty(i.reorder_level)}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Card>
    );
}

const poTone = { sent: 'info', partial: 'warning' } as const;

export function PurchasingCard({ p }: { p: Purchasing }) {
    return (
        <Card title="Purchasing" hint="Orders to suppliers">
            <div className="grid grid-cols-3 gap-4">
                <Stat label="Drafts" value={int(p.draft)} />
                <Stat label="On order" value={int(p.sent + p.partial)} sub={peso(p.open_cents, false)} />
                <Stat label="Overdue" value={int(p.overdue)} tone={p.overdue > 0 ? 'danger' : undefined} />
            </div>

            <p className="text-muted-foreground mt-4 mb-1.5 text-xs font-medium tracking-wide uppercase">Expected this week</p>
            {p.due.length === 0 ? (
                <p className="text-muted-foreground text-sm">No deliveries are due.</p>
            ) : (
                <ul className="space-y-2">
                    {p.due.map((d) => (
                        <li key={d.id}>
                            <Link href={d.href} className="hover:bg-muted -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-1 text-sm">
                                <span className="min-w-0">
                                    <span className="block truncate font-medium">{d.supplier}</span>
                                    <span className="text-muted-foreground block text-xs">{d.po_number} · {d.expected_at}</span>
                                </span>
                                <span className="flex shrink-0 items-center gap-2">
                                    {d.overdue ? <Pill tone="danger">Overdue</Pill> : <Pill tone={poTone[d.status as keyof typeof poTone] ?? 'neutral'}>{words(d.status)}</Pill>}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

export function KioskCard({ kiosk, range, now }: { kiosk: Kiosk; range: Range; now: number }) {
    const s = kiosk.sessions;

    return (
        <Card title="Kiosks" hint={`Sessions: ${range.label.toLowerCase()}`} action={kiosk.demo ? <Pill tone="info">Sample data</Pill> : <Monitor className="text-muted-foreground size-4" />}>
            {kiosk.devices.length === 0 ? (
                <Empty>No kiosk is registered.</Empty>
            ) : (
                <ul className="space-y-2">
                    {kiosk.devices.map((d) => (
                        <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="flex min-w-0 items-center gap-2">
                                <span className={cn('size-2.5 shrink-0 rounded-full', d.out_of_service ? 'bg-amber-500' : d.online ? 'bg-green-500' : 'bg-red-500')} />
                                <span className="truncate">{d.name}</span>
                            </span>
                            <span className="text-muted-foreground shrink-0 text-xs">{d.out_of_service ? 'Out of service' : d.online ? 'Online' : `Seen ${ago(d.last_seen_at, now)}`}</span>
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
                <Stat label="Sessions" value={int(s.total)} />
                <Stat label="Ordered" value={`${s.rate}%`} sub={`${int(s.completed)} completed`} tone={s.total > 0 ? (s.rate >= 60 ? 'good' : s.rate >= 40 ? 'warning' : 'danger') : undefined} />
                <Stat label="Walked away" value={int(s.abandoned)} />
            </div>
        </Card>
    );
}
