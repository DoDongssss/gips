import { Link } from '@inertiajs/react';
import { AlertTriangle, CircleAlert, Info } from 'lucide-react';

import type { AttentionItem } from '@/types/dashboard';
import { cn } from '@/lib/utils';

const styles = {
    danger: { box: 'border-red-200/80 bg-red-50/90 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200', Icon: CircleAlert },
    warning: { box: 'border-amber-200/80 bg-amber-50/90 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200', Icon: AlertTriangle },
    info: { box: 'border-blue-200/80 bg-blue-50/90 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200', Icon: Info },
} as const;

export function AttentionStrip({ items }: { items: AttentionItem[] }) {
    if (items.length === 0) {
        return null;
    }

    return (
        <ul className="flex flex-wrap gap-2" aria-label="Needs attention">
            {items.map((item) => {
                const { box, Icon } = styles[item.level];
                const inner = (
                    <>
                        <Icon className="size-3.5 shrink-0" />
                        <span className="text-sm font-medium">{item.text}</span>
                    </>
                );

                return (
                    <li key={item.id}>
                        {item.href ? (
                            <Link href={item.href} className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 hover:underline', box)}>
                                {inner}
                            </Link>
                        ) : (
                            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5', box)}>{inner}</span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
