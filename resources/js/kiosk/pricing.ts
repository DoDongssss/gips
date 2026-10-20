import type { CartLine, Modifier, Product, Variant } from '@/kiosk/types';

/**
 * The price the customer SEES. The server recalculates everything (prices, tax) from its own database
 * when the order is placed, so this is only an estimate and is never sent.
 */
export function unitCents(product: Product, variant: Variant | null, modifiers: Modifier[]): number {
    return (variant ? variant.price_cents : product.base_price_cents) + modifiers.reduce((sum, m) => sum + m.price_delta_cents, 0);
}

export const lineCents = (line: CartLine): number => unitCents(line.product, line.variant, line.modifiers) * line.quantity;

export const cartCents = (lines: CartLine[]): number => lines.reduce((sum, l) => sum + lineCents(l), 0);

export const cartCount = (lines: CartLine[]): number => lines.reduce((sum, l) => sum + l.quantity, 0);

/** Two identical orders of the same drink merge into one line with quantity 2. */
export function lineKey(productId: number, variantId: number | null, modifiers: Modifier[]): string {
    return [productId, variantId ?? 0, modifiers.map((m) => m.id).sort((a, b) => a - b).join('.')].join(':');
}

/** How many options a group needs before the customer may continue. */
export function neededFrom(group: { is_required: boolean; min_select: number }): number {
    return group.is_required ? Math.max(1, group.min_select) : group.min_select;
}
