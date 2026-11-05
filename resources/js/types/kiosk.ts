import type { BusinessInfo, PrinterSettings } from '@/types/printer';

export type KioskSettings = {
    language: string;
    theme: string | null;
    payment_mode: 'pay_at_counter';
    idle_timeout_seconds: number;
    upsell_enabled: boolean;
    large_text: boolean;
    is_out_of_service: boolean;
    welcome_message: string | null;
};

export type ScreenRow = {
    id: number;
    title: string;
    type: 'welcome' | 'promo' | 'banner';
    image_url: string | null;
    headline: string | null;
    subtext: string | null;
    sort_order: number;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
    showing: boolean;
};

export type UpsellRuleRow = {
    id: number;
    trigger_product_id: number | null;
    trigger_category_id: number | null;
    trigger: string | null;
    trigger_kind: 'product' | 'category';
    suggested_product_id: number;
    suggested: string | null;
    upsell_price_cents: number | null;
    channel: 'all' | 'pos' | 'kiosk';
    message: string | null;
    priority: number;
    is_active: boolean;
};

export type NamedOption = { id: number; name: string };

export type KioskModifier = {
    id: number;
    name: string;
    price_delta_cents: number;
    is_default: boolean;
    is_available: boolean;
};

export type KioskModifierGroup = {
    id: number;
    name: string;
    selection_type: 'single' | 'multiple';
    is_required: boolean;
    min_select: number;
    max_select: number | null;
    modifiers: KioskModifier[];
};

export type KioskVariant = { id: number; name: string; price_cents: number; is_default: boolean };

export type KioskProduct = {
    id: number;
    category_id: number;
    name: string;
    description: string | null;
    base_price_cents: number;
    is_available: boolean;
    image_url: string | null;
    variants: KioskVariant[];
    modifier_groups: KioskModifierGroup[];
};

export type KioskCategory = { id: number; name: string; slug: string; sort_order: number; products: KioskProduct[] };

export type KioskPrinterBundle = {
    settings: PrinterSettings;
    business: BusinessInfo;
};

export type KioskStatus = {
    device: { id: number; name: string };
    settings: KioskSettings | null;
    payment_instructions?: string | null;
    unpaid_expiry_minutes: number;
    server_time: string;
    printer?: KioskPrinterBundle;
};

export type KioskBanner = {
    id: number;
    title: string;
    type: string;
    image_url: string | null;
    content: { headline?: string; subtext?: string } | null;
};

export type KioskSuggestion = {
    rule_id: number;
    product_id: number;
    message: string | null;
    upsell_price_cents: number | null;
    product?: KioskProduct | null;
};

export type KioskPricedSummary = {
    subtotal_cents: number;
    discount_cents: number;
    tax_cents: number;
    total_cents: number;
};

export type KioskOrderType = 'dine_in' | 'takeout';

export type KioskCartLine = {
    key: string;
    product: KioskProduct;
    variant: KioskVariant | null;
    modifiers: KioskModifier[];
    quantity: number;
    notes?: string | null;
    upsellRuleId?: number | null;
    upsellUnitPriceCents?: number | null;
};

export type KioskPlacedOrder = {
    order_number: string;
    type: KioskOrderType;
    subtotal_cents: number;
    discount_cents: number;
    tax_cents: number;
    total_cents: number;
    requires_verification: boolean;
    pay_at: 'counter';
    expires_in_minutes: number;
    items: {
        name: string;
        variant: string | null;
        quantity: number;
        line_total_cents: number;
        modifiers: { name: string; price_delta_cents: number }[];
    }[];
};

export type KioskStep = 'pairing' | 'welcome' | 'type' | 'menu' | 'cart' | 'upsell' | 'done';

export type Modifier = KioskModifier;
export type ModifierGroup = KioskModifierGroup;
export type Variant = KioskVariant;
export type Product = KioskProduct;
export type Category = KioskCategory;
export type Status = KioskStatus;
export type Banner = KioskBanner;
export type Suggestion = KioskSuggestion;
export type PricedSummary = KioskPricedSummary;
export type OrderType = KioskOrderType;
export type CartLine = KioskCartLine;
export type PlacedOrder = KioskPlacedOrder;
export type Step = KioskStep;
