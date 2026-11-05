import { useEffect, useMemo, useState } from 'react';

import { useDebounced } from '@/hooks/shared/use-debounced';
import { api } from '@/lib/kiosk/api';
import { cartCents } from '@/lib/kiosk/pricing';
import { useKiosk } from '@/stores/kiosk-store';
import type { PricedSummary } from '@/types/kiosk';

export function useKioskOrderPreview(): { summary: PricedSummary | null; calculating: boolean; fallbackCents: number } {
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
                    upsell_rule_id: l.upsellRuleId ?? null,
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
