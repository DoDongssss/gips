import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import type { CartPayload } from '@/lib/pos-api';
import { configQuery, menuQuery, previewOrder } from '@/lib/pos-api';
import { buildCartPayload, useCartStore } from '@/stores/cart-store';

function useDebounced<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delay);

        return () => window.clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}

type Options = {
    /** Always ask the server for the exact price (the checkout dialog does this). */
    exact?: boolean;
};

/**
 * The price of the cart as it is right now.
 *
 * While the cashier is only adding items, line prices and the subtotal are worked out here from the
 * menu that is already loaded, so tapping a product makes no request. The server's /orders/preview
 * is used when its answer matters: at checkout, when a discount is applied, or when tax is added on top.
 */
export function usePricedCart({ exact = false }: Options = {}) {
    const cart = useCartStore();
    const hasLines = cart.lines.length > 0;

    const menu = useQuery(menuQuery);
    const config = useQuery(configQuery);

    const localLines = useMemo(() => {
        const products = new Map((menu.data ?? []).flatMap((category) => category.products).map((product) => [product.id, product]));

        return cart.lines.map((line) => {
            const product = products.get(line.product_id);

            if (!product) {
                return null;
            }

            const variant = product.variants.find((v) => v.id === line.variant_id);
            const modifiers = product.groups.flatMap((group) => group.modifiers).filter((m) => line.modifier_ids.includes(m.id));
            // A price the cashier changed replaces the list price; add-ons still go on top.
            const base = line.price_override ? line.price_override.unit_price_cents : variant ? variant.price_cents : product.base_price_cents;
            const unit = base + modifiers.reduce((sum, m) => sum + m.price_delta_cents, 0);

            return { unit_cents: unit, gross_cents: unit * line.quantity };
        });
    }, [cart.lines, menu.data]);

    const localReady = localLines.every((line) => line !== null);
    const localSubtotal = localLines.reduce((sum, line) => sum + (line?.gross_cents ?? 0), 0);

    const taxIsAddedOnTop = !!config.data?.tax && !config.data.tax.is_inclusive;
    const needsServer = hasLines && (exact || cart.discounts.length > 0 || taxIsAddedOnTop || !localReady);

    const signature = useMemo(() => JSON.stringify(buildCartPayload(cart, { withApproval: false })), [cart]);
    const settled = useDebounced(signature, 250);

    const preview = useQuery({
        queryKey: ['pos', 'preview', settled],
        queryFn: () => previewOrder(JSON.parse(settled) as CartPayload),
        enabled: needsServer,
        placeholderData: keepPreviousData,
        retry: false,
    });

    const summary = needsServer ? preview.data : undefined;
    const calculating = needsServer && (signature !== settled || preview.isFetching);
    // Line prices only line up once the answer matches the current cart.
    const priced = summary && summary.lines.length === cart.lines.length ? summary : undefined;

    return {
        hasLines,
        summary,
        priced,
        calculating,
        error: needsServer && preview.isError ? preview.error : null,
        /** True while the numbers come from the menu on screen instead of the server. */
        isLocal: hasLines && !needsServer,
        localLines,
        localSubtotal,
    };
}
