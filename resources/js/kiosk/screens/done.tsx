import { Banknote, Check, Hash } from 'lucide-react';
import { useEffect, useState } from 'react';

import { peso, typeLabel } from '@/kiosk/format';
import { useKiosk } from '@/kiosk/store';
import { BigButton, Frame, warningText } from '@/kiosk/screens/ui';
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
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto p-10 text-center">
                <div className="space-y-4">
                    <span className="bg-success text-success-foreground ring-success/20 mx-auto flex size-24 items-center justify-center rounded-full shadow-lg ring-8">
                        <Check className="size-12" strokeWidth={3} />
                    </span>
                    <p className="text-6xl font-semibold tracking-tight">Thank you!</p>
                </div>

                {/* Ticket */}
                <div className="bg-card w-full max-w-3xl overflow-hidden rounded-3xl shadow-xl">
                    <div className="bg-primary text-primary-foreground px-10 py-8">
                        <p className="text-primary-foreground/70 flex items-center justify-center gap-2 text-2xl">
                            <Hash className="size-6" />
                            Your order number
                        </p>
                        <p className="text-9xl leading-none font-semibold tracking-tight tabular-nums portrait:text-[12rem]">{placed.order_number}</p>
                    </div>

                    <div className="relative">
                        <span aria-hidden className="bg-secondary absolute top-0 -left-5 size-10 -translate-y-1/2 rounded-full" />
                        <span aria-hidden className="bg-secondary absolute top-0 -right-5 size-10 -translate-y-1/2 rounded-full" />
                        <div className="border-border mx-8 border-t-2 border-dashed" />
                    </div>

                    <div className="space-y-4 px-10 py-6 text-left">
                        <ul className="space-y-1.5 text-xl">
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
                        <div className="border-border flex items-baseline justify-between border-t pt-4">
                            <span className="text-muted-foreground text-xl">
                                {typeLabel(placed.type)} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            </span>
                            <span className="text-4xl font-semibold tabular-nums">{peso(placed.total_cents)}</span>
                        </div>
                    </div>
                </div>

                {/* Next steps */}
                <div className="grid w-full max-w-3xl grid-cols-2 gap-4 text-left">
                    <div className="bg-accent text-accent-foreground flex items-center gap-4 rounded-2xl p-5">
                        <span className="bg-card flex size-14 shrink-0 items-center justify-center rounded-full shadow-sm">
                            <Banknote className="size-7" />
                        </span>
                        <span className="text-2xl leading-tight font-semibold">Pay at the counter</span>
                    </div>
                    <div className="bg-accent text-accent-foreground flex items-center gap-4 rounded-2xl p-5">
                        <span className="bg-card flex size-14 shrink-0 items-center justify-center rounded-full text-2xl font-semibold shadow-sm tabular-nums">#</span>
                        <span className="text-2xl leading-tight font-semibold">Wait for your number</span>
                    </div>
                </div>

                {placed.requires_verification && <p className={cn('border-warning/50 bg-warning/15 rounded-2xl border-2 px-6 py-4 text-xl font-semibold', warningText)}>Please show your senior / PWD ID to the cashier.</p>}

                <p className="text-muted-foreground">Your order is held for {placed.expires_in_minutes} minutes until it is paid.</p>
            </div>

            <div className="bg-card space-y-3 rounded-t-3xl p-6 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.2)]">
                <div className="bg-secondary h-1.5 overflow-hidden rounded-full">
                    <div className="bg-primary h-full rounded-full transition-all duration-1000 ease-linear" style={{ width: `${Math.max(0, (left / RETURN_SECONDS) * 100)}%` }} />
                </div>
                <BigButton onClick={() => reset()} className="w-full">
                    Done ({Math.max(left, 0)})
                </BigButton>
            </div>
        </Frame>
    );
}
