import { useEffect, useState } from 'react';

import { peso, typeLabel } from '@/kiosk/format';
import { useKiosk } from '@/kiosk/store';
import { BigButton, Frame } from '@/kiosk/screens/ui';

const RETURN_SECONDS = 20;

/** Pickup number, what to do next, then back to the welcome screen on its own. */
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

    return (
        <Frame className="items-center justify-center gap-6 p-8 text-center">
            <p className="text-muted-foreground text-2xl">Thank you! Your order number is</p>
            <p className="text-primary text-9xl font-extrabold tracking-tight">{placed.order_number}</p>
            <p className="text-3xl font-semibold">Please pay at the counter</p>
            <p className="text-muted-foreground text-xl">
                {typeLabel(placed.type)} · {placed.items.reduce((n, i) => n + i.quantity, 0)} item(s) · {peso(placed.total_cents)}
            </p>
            {placed.requires_verification && <p className="bg-amber-100 text-amber-900 rounded-2xl px-6 py-3 text-xl">Please show your senior / PWD ID to the cashier.</p>}
            <p className="text-muted-foreground">Your order is held for {placed.expires_in_minutes} minutes until it is paid.</p>
            <BigButton onClick={() => reset()} className="mt-4 min-w-64">
                Done ({Math.max(left, 0)})
            </BigButton>
        </Frame>
    );
}
