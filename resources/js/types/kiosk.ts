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
    /** "YYYY-MM-DDTHH:mm", ready for a datetime-local input. */
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
    channel: 'all' | 'pos' | 'kiosk';
    message: string | null;
    priority: number;
    is_active: boolean;
};

export type NamedOption = { id: number; name: string };
