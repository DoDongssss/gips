import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Shown when a product has no picture, or its picture is missing on disk.
 * File: storage/app/public/menu/products/default_product.jpg (served through `php artisan storage:link`).
 */
export const DEFAULT_PRODUCT_IMAGE = '/storage/menu/products/default_product.jpg';

/*
 * Colour helpers. Everything comes from your theme (app.css): navy, accent blue, success, warning and the chart colours.
 * "Tints" are the soft category colours (blue, green, amber, purple, red).
 *
 * Shape scale used on every kiosk screen (soft, never pill-shaped except dots):
 *   rounded-md   badges and small chips
 *   rounded-lg   buttons, inputs, tabs, steppers, images
 *   rounded-xl   cards and panels
 *   rounded-2xl  dialogs and sheets (the largest radius)
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

/** Touch-sized button: at least 56px tall, no hover-only states (a tablet has no hover). */
export function BigButton({ variant = 'primary', className, children, ...props }: { variant?: Variant } & ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type="button"
            {...props}
            className={cn(
                'inline-flex min-h-14 items-center justify-center gap-2 rounded-xl px-6 text-lg font-semibold tracking-tight transition-all duration-150 select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
                variant === 'primary' && 'bg-primary text-primary-foreground shadow-sm active:brightness-110',
                variant === 'success' && 'bg-success text-success-foreground shadow-sm active:brightness-110',
                variant === 'tonal' && 'bg-accent text-accent-foreground active:brightness-95',
                variant === 'outline' && 'border-border bg-card active:bg-muted border',
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
        <button type="button" onClick={onClick} aria-label="Back" className="bg-card text-foreground inline-flex size-12 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-transform active:scale-90 portrait:size-14">
            <ArrowLeft className="size-5" />
        </button>
    );
}

export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
    return (
        <header className="bg-card flex items-center gap-3 border-b px-5 py-3">
            {onBack && <BackButton onClick={onBack} />}
            <h1 className="flex-1 truncate text-3xl font-semibold tracking-tight portrait:text-4xl">{title}</h1>
            {right}
        </header>
    );
}

/** Small label with an optional icon, e.g. "Dine in". */
export function Pill({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
    return (
        <span className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-lg px-4 py-3 text-base font-medium whitespace-nowrap shadow-sm [&_svg]:size-5">
            {icon}
            {children}
        </span>
    );
}

/** Section title with a small accent bar and an optional badge on the right (used in the item dialog). */
export function SectionHeading({ title, badge }: { title: string; badge?: ReactNode }) {
    return (
        <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
                <span aria-hidden className="bg-primary h-5 w-1 rounded-sm" />
                {title}
            </h3>
            {badge}
        </div>
    );
}

/**
 * A product picture. Falls back to the default product image, and to a soft tile with the first letter
 * if that is missing too, so a broken image never shows.
 */
export function Thumb({ src, name, className, tint }: { src: string | null; name: string; className?: string; tint?: string }) {
    const [stage, setStage] = useState<'src' | 'default' | 'letter'>(src ? 'src' : 'default');

    useEffect(() => {
        setStage(src ? 'src' : 'default');
    }, [src]);

    if (stage === 'letter') {
        return (
            <div className={cn('flex items-center justify-center text-5xl font-semibold', className)} style={tintStyle(tint ?? tintAt(name.charCodeAt(0)))} aria-hidden>
                {name.charAt(0).toUpperCase()}
            </div>
        );
    }

    return (
        <img
            src={stage === 'src' && src ? src : DEFAULT_PRODUCT_IMAGE}
            alt=""
            draggable={false}
            onError={() => setStage((current) => (current === 'src' ? 'default' : 'letter'))}
            className={cn('object-cover', className)}
        />
    );
}

export function Stepper({ value, onChange, min = 1 }: { value: number; onChange: (n: number) => void; min?: number }) {
    return (
        <div className="bg-secondary flex items-center rounded-xl p-1">
            <button type="button" aria-label="Fewer" disabled={value <= min} onClick={() => onChange(value - 1)} className="bg-card text-foreground flex size-12 items-center justify-center rounded-lg shadow-sm transition-transform active:scale-90 disabled:opacity-30">
                <Minus className="size-5" />
            </button>
            <span className="w-12 text-center text-2xl font-semibold tabular-nums">{value}</span>
            <button type="button" aria-label="More" disabled={value >= 99} onClick={() => onChange(value + 1)} className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-lg shadow-sm transition-transform active:scale-90 disabled:opacity-30">
                <Plus className="size-5" />
            </button>
        </div>
    );
}

/** Compact stepper for the order list. At 1 the minus becomes a bin, so tapping it removes the line. */
export function CompactStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
    return (
        <div className="bg-card flex shrink-0 items-center rounded-lg border p-0.5">
            <button type="button" aria-label={value <= 1 ? 'Remove' : 'Fewer'} onClick={() => onChange(value - 1)} className="bg-secondary flex size-10 items-center justify-center rounded-md transition-transform active:scale-90">
                {value <= 1 ? <Trash2 className="text-destructive size-4" /> : <Minus className="size-4" />}
            </button>
            <span className="w-8 text-center text-base font-semibold tabular-nums">{value}</span>
            <button type="button" aria-label="More" disabled={value >= 99} onClick={() => onChange(value + 1)} className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-md transition-transform active:scale-90 disabled:opacity-30">
                <Plus className="size-4" />
            </button>
        </div>
    );
}
