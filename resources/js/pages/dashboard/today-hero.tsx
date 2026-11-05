import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

import { Card, Stat } from './card';
import { delta, int, peso, percent } from './format';
import type { Live, Range, Sales } from '@/types/dashboard';
import { cn } from '@/lib/utils';

function Change({ current, previous }: { current: number; previous: number }) {
    const d = delta(current, previous);
    if (d === null) return <span className="text-muted-foreground text-xs">new</span>;
    if (Math.abs(d) < 0.0005) {
        return (
            <span className="text-muted-foreground inline-flex items-center gap-0.5 text-xs">
                <Minus className="size-3" /> vs yesterday
            </span>
        );
    }

    const up = d > 0;
    const Icon = up ? ArrowUpRight : ArrowDownRight;

    return (
        <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', up ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
            <Icon className="size-3.5" />
            {percent(Math.abs(d), Math.abs(d) < 0.1 ? 1 : 0)} vs yesterday
        </span>
    );
}

/** Today: net sales + live pipeline in one primary row. */
export function TodayHero({ sales, live, range }: { sales: Sales; live: Live; range: Range }) {
    const cur = sales.summary;
    const prev = sales.previous;
    const inProgress = Object.values(live.pipeline).reduce((a, b) => a + b, 0);

    return (
        <Card className="lg:col-span-3">
            <div className="grid gap-4 lg:grid-cols-4">
                <div className="lg:col-span-2">
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Today · {range.label}</p>
                    <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">{peso(cur.net_cents)}</p>
                    <p className="mt-1">
                        <Change current={cur.net_cents} previous={prev.net_cents} />
                    </p>
                    <p className="text-muted-foreground mt-2 text-sm">
                        {int(cur.orders)} paid orders · {int(cur.items)} items
                    </p>
                </div>
                <Stat label="In progress" value={int(inProgress)} sub="open through ready" />
                <Stat
                    label="Kitchen"
                    value={live.kitchen.tickets}
                    sub={live.kitchen.oldest_minutes !== null ? `${live.kitchen.oldest_minutes} min longest` : 'no queue'}
                    tone={live.kitchen.oldest_minutes !== null && live.kitchen.oldest_minutes >= 15 ? 'danger' : live.kitchen.oldest_minutes !== null && live.kitchen.oldest_minutes >= 8 ? 'warning' : undefined}
                />
                <Stat label="Unpaid today" value={int(live.unpaid.count)} sub={live.unpaid.count > 0 ? peso(live.unpaid.due_cents) + ' due' : 'all caught up'} tone={live.unpaid.count > 0 ? 'warning' : 'good'} />
            </div>
        </Card>
    );
}
