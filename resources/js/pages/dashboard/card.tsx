import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** The shared shell every dashboard block uses. */
export function Card({ title, hint, action, className, children }: { title?: string; hint?: string; action?: ReactNode; className?: string; children: ReactNode }) {
    return (
        <section className={cn('border-sidebar-border/70 dark:border-sidebar-border bg-card flex flex-col rounded-xl border p-4', className)}>
            {(title || action) && (
                <header className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {title && <h2 className="truncate text-sm font-semibold">{title}</h2>}
                        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
                    </div>
                    {action}
                </header>
            )}
            {children}
        </section>
    );
}

export function Empty({ children }: { children: ReactNode }) {
    return <p className="text-muted-foreground py-6 text-center text-sm">{children}</p>;
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'danger' | 'warning' | 'good' }) {
    return (
        <div className="min-w-0">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p
                className={cn(
                    'truncate text-xl font-semibold tabular-nums',
                    tone === 'danger' && 'text-red-600 dark:text-red-400',
                    tone === 'warning' && 'text-amber-600 dark:text-amber-400',
                    tone === 'good' && 'text-green-600 dark:text-green-400',
                )}
            >
                {value}
            </p>
            {sub && <p className="text-muted-foreground truncate text-xs">{sub}</p>}
        </div>
    );
}

const tones = {
    neutral: 'bg-muted text-muted-foreground',
    good: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    danger: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
} as const;

export type Tone = keyof typeof tones;

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
    return <span className={cn('inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}
