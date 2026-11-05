import { Banknote, Check, Hash } from 'lucide-react';
import { useEffect, useState } from 'react';

import { peso, typeLabel } from '@/lib/kiosk/format';
import { useKiosk } from '@/stores/kiosk-store';
import { BigButton, Frame, warningText } from '@/components/kiosk/ui';
import { cn } from '@/lib/utils';

const RETURN_SECONDS = 20;

/** Pickup number on a ticket, the next two steps, then back to the welcome screen on its own. */
export default function DoneScreen() {
    const placed = useKiosk((s) => s.placed);
    const reset = useKiosk((s) => s.reset);
    const [left, setLeft] = useState(RETURN_SECONDS);

    useEffect(() => {
        const timer = window.setInterval(() => setLeft((n) => n - 1), 1000);

        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        if (left <= 0) reset();
    }, [left, reset]);

    if (!placed) return null;

    const itemCount = placed.items.reduce((n, i) => n + i.quantity, 0);

    return (
        <Frame className="bg-secondary animate-in fade-in duration-500">
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto p-6 text-center">
                <div className="space-y-3">
                    <span className="bg-success text-success-foreground ring-success/20 mx-auto flex size-20 items-center justify-center rounded-2xl shadow-md ring-4">
                        <Check className="size-10" strokeWidth={3} />
                    </span>
                    <p className="text-5xl font-semibold tracking-tight">Thank you!</p>
                </div>

                {/* Ticket */}
                <div className="bg-card ring-border w-full max-w-2xl overflow-hidden rounded-2xl shadow-lg ring-1">
                    <div className="bg-primary text-primary-foreground px-8 py-6">
                        <p className="text-primary-foreground/70 flex items-center justify-center gap-1.5 text-xl">
                            <Hash className="size-5" />
                            Your order number
                        </p>
                        <p className="text-8xl leading-none font-semibold tracking-tight tabular-nums portrait:text-[10rem]">{placed.order_number}</p>
                    </div>

                    <div className="relative">
                        <span aria-hidden className="bg-secondary absolute top-0 -left-4 size-8 -translate-y-1/2 rounded-full" />
                        <span aria-hidden className="bg-secondary absolute top-0 -right-4 size-8 -translate-y-1/2 rounded-full" />
                        <div className="border-border mx-6 border-t-2 border-dashed" />
                    </div>

                    <div className="space-y-3 px-8 py-5 text-left">
                        <ul className="space-y-1 text-lg">
                            {placed.items.map((item, i) => (
                                <li key={i} className="flex justify-between gap-4">
                                    <span className="min-w-0 truncate">
                                        <span className="text-muted-foreground mr-2 tabular-nums">{item.quantity}×</span>
                                        {item.name}
                                        {item.variant && <span className="text-muted-foreground"> · {item.variant}</span>}
                                    </span>
                                    <span className="tabular-nums">{peso(item.line_total_cents)}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="border-border flex items-baseline justify-between border-t pt-3">
                            <span className="text-muted-foreground text-lg">
                                {typeLabel(placed.type)} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            </span>
                            <span className="text-3xl font-semibold tabular-nums">{peso(placed.total_cents)}</span>
                        </div>
                    </div>
                </div>

                {/* Next steps */}
                <div className="grid w-full max-w-2xl grid-cols-2 gap-3 text-left">
                    <div className="bg-accent text-accent-foreground flex items-center gap-3 rounded-xl p-4">
                        <span className="bg-card flex size-12 shrink-0 items-center justify-center rounded-lg shadow-sm">
                            <Banknote className="size-6" />
                        </span>
                        <span className="text-xl leading-tight font-semibold">Pay at the counter</span>
                    </div>
                    <div className="bg-accent text-accent-foreground flex items-center gap-3 rounded-xl p-4">
                        <span className="bg-card flex size-12 shrink-0 items-center justify-center rounded-lg text-xl font-semibold shadow-sm tabular-nums">#</span>
                        <span className="text-xl leading-tight font-semibold">Wait for your number</span>
                    </div>
                </div>

                {placed.requires_verification && <p className={cn('border-warning/50 bg-warning/15 rounded-xl border-2 px-5 py-3 text-lg font-semibold', warningText)}>Please show your senior / PWD ID to the cashier.</p>}

                <p className="text-muted-foreground text-sm">Your order is held for {placed.expires_in_minutes} minutes until it is paid.</p>
            </div>

            <div className="bg-card space-y-2.5 border-t p-4">
                <div className="bg-secondary h-1 overflow-hidden rounded-full">
                    <div className="bg-primary h-full rounded-full transition-all duration-1000 ease-linear" style={{ width: `${Math.max(0, (left / RETURN_SECONDS) * 100)}%` }} />
                </div>
                <BigButton onClick={() => reset()} className="w-full">
                    Done ({Math.max(left, 0)})
                </BigButton>
            </div>
        </Frame>
    );
}
