import { useEffect, useMemo, useState } from 'react';

import { api } from '@/kiosk/api';
import { cartCents } from '@/kiosk/pricing';
import { useKiosk } from '@/kiosk/store';
import type { PricedSummary } from '@/kiosk/types';

function useDebounced<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delay);

        return () => window.clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}

/** Server-priced cart totals for the kiosk order drawer (tax-aware). */
export function useOrderPreview(): { summary: PricedSummary | null; calculating: boolean; fallbackCents: number } {
    const lines = useKiosk((s) => s.lines);
    const orderType = useKiosk((s) => s.orderType);

    const signature = useMemo(
        () =>
            JSON.stringify({
                type: orderType,
                items: lines.map((l) => ({
                    product_id: l.product.id,
                    variant_id: l.variant?.id ?? null,
                    quantity: l.quantity,
                    modifiers: l.modifiers.map((m) => m.id),
                    notes: l.notes ?? null,
                })),
            }),
        [lines, orderType],
    );

    const settled = useDebounced(signature, 300);
    const [summary, setSummary] = useState<PricedSummary | null>(null);
    const [calculating, setCalculating] = useState(false);

    useEffect(() => {
        if (!orderType || lines.length === 0) {
            setSummary(null);
            setCalculating(false);

            return;
        }

        let cancelled = false;
        setCalculating(true);

        void api
            .previewOrder(JSON.parse(settled) as { type: typeof orderType; items: { product_id: number; variant_id: number | null; quantity: number; modifiers: number[] }[] })
            .then((data) => {
                if (!cancelled) {
                    setSummary(data);
                    setCalculating(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSummary(null);
                    setCalculating(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [settled, orderType, lines.length]);

    return { summary, calculating, fallbackCents: cartCents(lines) };
}
