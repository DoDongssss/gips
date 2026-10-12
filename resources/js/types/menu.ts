export type Option = { id: number; name: string };

export type CategoryItem = {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    products_count: number;
};

export type ProductRow = {
    id: number;
    name: string;
    sku: string | null;
    category_id: number;
    category_name: string | null;
    base_price_cents: number;
    is_active: boolean;
    is_available: boolean;
    variants_count: number;
    image_url: string | null;
};

export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

export type Variant = {
    id?: number;
    name: string;
    price_cents: number;
    is_default: boolean;
    is_active: boolean;
};

export type ProductImage = { id: number; url: string; alt: string | null; is_primary: boolean };

export type ProductDetail = {
    id: number;
    category_id: number;
    name: string;
    sku: string | null;
    description: string | null;
    base_price_cents: number;
    is_taxable: boolean;
    is_active: boolean;
    is_available: boolean;
    prep_time_seconds: number | null;
    variants: Variant[];
    images: ProductImage[];
    modifier_group_ids: number[];
};

export type ModifierItem = {
    id?: number;
    name: string;
    price_delta_cents: number;
    is_default: boolean;
    is_available: boolean;
};

export type ModifierGroupItem = {
    id: number;
    name: string;
    selection_type: 'single' | 'multiple';
    is_required: boolean;
    min_select: number;
    max_select: number | null;
    is_active: boolean;
    products_count: number;
    modifiers: (ModifierItem & { id: number })[];
};

export type AttachableGroup = {
    id: number;
    name: string;
    selection_type: 'single' | 'multiple';
    is_required: boolean;
    options: string[];
};

/** Shape returned by GET /api/v1/menu */
export type MenuModifier = { id: number; name: string; price_delta_cents: number; is_default: boolean; is_available: boolean };
export type MenuModifierGroup = {
    id: number;
    name: string;
    selection_type: 'single' | 'multiple';
    is_required: boolean;
    min_select: number;
    max_select: number | null;
    modifiers: MenuModifier[];
};
export type MenuVariant = { id: number; name: string; price_cents: number; is_default: boolean };
export type MenuProduct = {
    id: number;
    category_id: number;
    name: string;
    slug: string;
    sku: string | null;
    description: string | null;
    base_price_cents: number;
    is_taxable: boolean;
    is_available: boolean;
    prep_time_seconds: number | null;
    image_url: string | null;
    images: { id: number; url: string; is_primary: boolean }[];
    variants: MenuVariant[];
    modifier_groups: MenuModifierGroup[];
};
export type MenuCategory = { id: number; name: string; slug: string; sort_order: number; products: MenuProduct[] };
