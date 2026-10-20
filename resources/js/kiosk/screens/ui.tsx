import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Variant = 'primary' | 'outline' | 'ghost';

/** Touch-sized button: at least 56px tall, no hover-only states (a tablet has no hover). */
export function BigButton({ variant = 'primary', className, children, ...props }: { variant?: Variant } & ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type="button"
            {...props}
            className={cn(
                'inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-6 text-lg font-semibold transition-transform select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
                variant === 'primary' && 'bg-primary text-primary-foreground shadow-md',
                variant === 'outline' && 'border-border bg-background border-2',
                variant === 'ghost' && 'text-muted-foreground',
                className,
            )}
        >
            {children}
        </button>
    );
}

/** The full-screen frame every step sits in. */
export function Frame({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('bg-background text-foreground flex h-full min-h-0 flex-col', className)}>{children}</div>;
}

export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
    return (
        <header className="flex items-center gap-3 border-b px-5 py-3">
            {onBack && (
                <BigButton variant="outline" onClick={onBack} className="min-h-12 px-4 text-base" aria-label="Back">
                    ← Back
                </BigButton>
            )}
            <h1 className="flex-1 truncate text-2xl font-bold">{title}</h1>
            {right}
        </header>
    );
}

/** A picture, or a soft coloured tile with the first letter when the product has none. */
export function Thumb({ src, name, className }: { src: string | null; name: string; className?: string }) {
    if (src) {
        return <img src={src} alt="" draggable={false} className={cn('object-cover', className)} />;
    }

    return (
        <div className={cn('bg-primary/10 text-primary flex items-center justify-center text-5xl font-bold', className)} aria-hidden>
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

export function Stepper({ value, onChange, min = 1 }: { value: number; onChange: (n: number) => void; min?: number }) {
    return (
        <div className="bg-muted flex items-center gap-1 rounded-2xl p-1">
            <button type="button" aria-label="Fewer" disabled={value <= min} onClick={() => onChange(value - 1)} className="bg-background size-12 rounded-xl text-2xl font-bold shadow-sm active:scale-95 disabled:opacity-30">
                −
            </button>
            <span className="w-10 text-center text-xl font-bold tabular-nums">{value}</span>
            <button type="button" aria-label="More" disabled={value >= 99} onClick={() => onChange(value + 1)} className="bg-background size-12 rounded-xl text-2xl font-bold shadow-sm active:scale-95 disabled:opacity-30">
                +
            </button>
        </div>
    );
}
