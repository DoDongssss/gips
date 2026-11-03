import type { MenuCategory, MenuProduct } from '@/pages/pos/types';

/**
 * The ONLY place that knows the shape of GET /api/v1/menu.
 *
 * It accepts the usual spellings (`modifier_groups` or `groups`, `modifiers` or `options`,
 * `image_url` or an `images` list) so a small difference in the Phase 2 response does not
 * break the register. If your response is different, adjust this file and nothing else.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

const list = (value: unknown): Raw[] => (Array.isArray(value) ? value : []);

function normalizeProduct(p: Raw): MenuProduct {
    const images = list(p.images);
    const primary = images.find((image) => image.is_primary) ?? images[0];

    return {
        id: Number(p.id),
        name: String(p.name),
        description: p.description ?? null,
        image_url: p.image_url ?? p.image ?? primary?.url ?? null,
        base_price_cents: Number(p.base_price_cents ?? p.price_cents ?? 0),
        is_available: p.is_available !== false,
        variants: list(p.variants).map((v) => ({
            id: Number(v.id),
            name: String(v.name),
            price_cents: Number(v.price_cents ?? 0),
            is_default: Boolean(v.is_default),
        })),
        groups: list(p.modifier_groups ?? p.modifierGroups ?? p.groups).map((g) => ({
            id: Number(g.id),
            name: String(g.name),
            is_required: Boolean(g.is_required),
            selection_type: g.selection_type === 'single' ? 'single' : 'multiple',
            min_select: Number(g.min_select ?? 0),
            max_select: g.max_select === null || g.max_select === undefined ? null : Number(g.max_select),
            modifiers: list(g.modifiers ?? g.options).map((m) => ({
                id: Number(m.id),
                name: String(m.name),
                price_delta_cents: Number(m.price_delta_cents ?? 0),
                is_available: m.is_available !== false,
            })),
        })),
    };
}

export function normalizeMenu(payload: unknown): MenuCategory[] {
    const root = (payload as Raw | null)?.data ?? payload;
    const categories = list(Array.isArray(root) ? root : (root as Raw | null)?.categories);

    return categories
        .map((category) => ({
            id: Number(category.id),
            name: String(category.name),
            products: list(category.products).map(normalizeProduct),
        }))
        .filter((category) => category.products.length > 0);
}
