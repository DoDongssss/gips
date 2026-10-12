// What the register needs from GET /api/v1/menu, after menu-adapter.ts has normalised it.

export type MenuModifier = {
    id: number;
    name: string;
    price_delta_cents: number;
    is_available: boolean;
};

export type MenuGroup = {
    id: number;
    name: string;
    is_required: boolean;
    selection_type: 'single' | 'multiple';
    min_select: number;
    max_select: number | null;
    modifiers: MenuModifier[];
};

export type MenuVariant = {
    id: number;
    name: string;
    price_cents: number;
    is_default: boolean;
};

export type MenuProduct = {
    id: number;
    name: string;
    description: string | null;
    image_url: string | null;
    base_price_cents: number;
    is_available: boolean;
    variants: MenuVariant[];
    groups: MenuGroup[];
};

export type MenuCategory = {
    id: number;
    name: string;
    products: MenuProduct[];
};

/** POST /api/v1/orders/preview */
export type PricedSummary = {
    lines: {
        index: number;
        product_id: number;
        product_name: string;
        variant_id: number | null;
        variant_name: string | null;
        quantity: number;
        unit_price_cents: number;
        modifiers_total_cents: number;
        modifiers: { modifier_id: number; group_name: string; modifier_name: string; price_delta_cents: number }[];
        gross_cents: number;
        discount_cents: number;
        tax_cents: number;
        line_total_cents: number;
    }[];
    discounts: { discount_id: number; name: string; item_index: number | null; amount_cents: number }[];
    taxes: { name: string; rate: string; is_inclusive: boolean; taxable_cents: number; tax_cents: number }[];
    subtotal_cents: number;
    discount_cents: number;
    tax_cents: number;
    total_cents: number;
    vat_exempt_sales_cents: number;
};
