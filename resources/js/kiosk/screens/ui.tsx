import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/*
 * Colour helpers. Everything comes from your theme (app.css): navy, accent blue, success, warning and the chart colours.
 * "Tints" are the soft category colours (blue, green, amber, purple, red).
 *
 * Shape scale used on every kiosk screen:
 *   rounded-full  chips, badges, round icon buttons
 *   rounded-xl    buttons, steppers, inputs
 *   rounded-2xl   cards, tiles, images
 *   rounded-3xl   panels, dialogs, sheets
 */
const tints = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'] as const;

export const tintAt = (index: number): string => tints[Math.abs(index) % tints.length];

/** A soft tinted background with readable text, for chips, tiles and icon badges. */
export const tintStyle = (tint: string) => ({
    backgroundColor: `color-mix(in oklch, ${tint} 16%, var(--card))`,
    color: `color-mix(in oklch, ${tint} 70%, var(--foreground))`,
});

/** Readable text colours for status words (plain --success on a light tint is too pale). */
export const successText = 'text-[color-mix(in_oklch,var(--success)_65%,var(--foreground))]';
export const warningText = 'text-[color-mix(in_oklch,var(--warning)_55%,var(--foreground))]';

type Variant = 'primary' | 'success' | 'tonal' | 'outline' | 'ghost';

/** Touch-sized button: at least 64px tall, no hover-only states (a tablet has no hover). */
export function BigButton({ variant = 'primary', className, children, ...props }: { variant?: Variant } & ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type="button"
            {...props}
            className={cn(
                'inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl px-8 text-xl font-semibold tracking-tight transition-all duration-150 select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
                variant === 'primary' && 'bg-primary text-primary-foreground shadow-md active:brightness-110',
                variant === 'success' && 'bg-success text-success-foreground shadow-md active:brightness-110',
                variant === 'tonal' && 'bg-accent text-accent-foreground active:brightness-95',
                variant === 'outline' && 'border-border bg-card active:bg-muted border-2',
                variant === 'ghost' && 'text-muted-foreground active:bg-muted',
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

export function BackButton({ onClick }: { onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} aria-label="Back" className="bg-card text-foreground inline-flex size-14 shrink-0 items-center justify-center rounded-full shadow-md transition-transform active:scale-90 portrait:size-16">
            <ArrowLeft className="size-6" />
        </button>
    );
}

export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
    return (
        <header className="flex items-center gap-4 px-8 pt-6 pb-2">
            {onBack && <BackButton onClick={onBack} />}
            <h1 className="flex-1 truncate text-4xl font-semibold tracking-tight portrait:text-5xl">{title}</h1>
            {right}
        </header>
    );
}

/** Small label, e.g. "Dine in". */
export function Pill({ children }: { children: ReactNode }) {
    return <span className="bg-primary text-primary-foreground rounded-full px-6 py-3.5 text-lg font-medium whitespace-nowrap shadow-md">{children}</span>;
}

/** Section title with an optional badge on the right (used in the item dialog). */
export function SectionHeading({ title, badge }: { title: string; badge?: ReactNode }) {
    return (
        <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
            {badge}
        </div>
    );
}

/** A picture, or a soft coloured tile with the first letter when the product has none. */
export function Thumb({ src, name, className, tint }: { src: string | null; name: string; className?: string; tint?: string }) {
    if (src) {
        return <img src={src} alt="" draggable={false} className={cn('object-cover', className)} />;
    }

    return (
        <div className={cn('flex items-center justify-center text-5xl font-semibold', className)} style={tintStyle(tint ?? tintAt(name.charCodeAt(0)))} aria-hidden>
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

export function Stepper({ value, onChange, min = 1 }: { value: number; onChange: (n: number) => void; min?: number }) {
    return (
        <div className="bg-secondary flex items-center rounded-2xl p-1.5">
            <button type="button" aria-label="Fewer" disabled={value <= min} onClick={() => onChange(value - 1)} className="bg-card text-foreground flex size-14 items-center justify-center rounded-xl shadow-sm transition-transform active:scale-90 disabled:opacity-30">
                <Minus className="size-6" />
            </button>
            <span className="w-14 text-center text-3xl font-semibold tabular-nums">{value}</span>
            <button type="button" aria-label="More" disabled={value >= 99} onClick={() => onChange(value + 1)} className="bg-primary text-primary-foreground flex size-14 items-center justify-center rounded-xl shadow-sm transition-transform active:scale-90 disabled:opacity-30">
                <Plus className="size-6" />
            </button>
        </div>
    );
}

/** Compact stepper for the order list. At 1 the minus becomes a bin, so tapping it removes the line. */
export function CompactStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
    return (
        <div className="bg-card flex shrink-0 items-center rounded-xl p-1 shadow-sm">
            <button type="button" aria-label={value <= 1 ? 'Remove' : 'Fewer'} onClick={() => onChange(value - 1)} className="bg-secondary flex size-11 items-center justify-center rounded-lg transition-transform active:scale-90">
                {value <= 1 ? <Trash2 className="text-destructive size-5" /> : <Minus className="size-5" />}
            </button>
            <span className="w-9 text-center text-lg font-semibold tabular-nums">{value}</span>
            <button type="button" aria-label="More" disabled={value >= 99} onClick={() => onChange(value + 1)} className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-lg transition-transform active:scale-90 disabled:opacity-30">
                <Plus className="size-5" />
            </button>
        </div>
    );
}
