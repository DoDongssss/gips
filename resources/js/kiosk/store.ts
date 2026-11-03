import { create } from 'zustand';

import { ApiError, api, tokenStore } from '@/kiosk/api';
import { cartCount, lineKey } from '@/kiosk/pricing';
import type { Banner, CartLine, Category, Modifier, OrderType, PlacedOrder, Product, Status, Step, Suggestion, Variant } from '@/kiosk/types';

type State = {
    step: Step;
    paired: boolean;
    status: Status | null;
    menu: Category[];
    banners: Banner[];
    /** false while the tablet cannot reach the server. The menu already loaded keeps working. */
    online: boolean;

    sessionUuid: string | null;
    orderType: OrderType | null;
    lines: CartLine[];
    seniorPwd: boolean;
    suggestions: Suggestion[];
    upsellDone: boolean;
    placed: PlacedOrder | null;
    placing: boolean;
    /** A message to show the customer (an item sold out, the server refused, ...). */
    notice: string | null;

    // lifecycle
    pair: (code: string) => Promise<void>;
    unpair: () => void;
    setStatus: (status: Status) => void;
    setMenu: (menu: Category[]) => void;
    setBanners: (banners: Banner[]) => void;
    setOnline: (online: boolean) => void;
    // customer flow
    begin: () => Promise<void>;
    chooseType: (type: OrderType) => void;
    goto: (step: Step) => void;
    addLine: (product: Product, variant: Variant | null, modifiers: Modifier[], quantity: number) => void;
    setQuantity: (key: string, quantity: number) => void;
    setSeniorPwd: (value: boolean) => void;
    checkout: () => Promise<void>;
    place: () => Promise<void>;
    reset: (reason?: 'timed_out' | 'abandoned') => void;
    dismissNotice: () => void;
};

const blank: Pick<State, 'sessionUuid' | 'orderType' | 'lines' | 'seniorPwd' | 'suggestions' | 'upsellDone' | 'placed' | 'placing' | 'notice'> = { sessionUuid: null, orderType: null, lines: [], seniorPwd: false, suggestions: [], upsellDone: false, placed: null, placing: false, notice: null };

export const useKiosk = create<State>((set, get) => ({
    step: tokenStore.get() ? 'welcome' : 'pairing',
    paired: tokenStore.get() !== null,
    status: null,
    menu: [],
    banners: [],
    online: true,
    ...blank,

    async pair(code) {
        const result = await api.pair(code);

        tokenStore.set(result.token);
        set({ paired: true, step: 'welcome', status: { device: result.device, settings: result.settings, unpaid_expiry_minutes: result.unpaid_expiry_minutes, server_time: result.server_time } });
    },

    unpair() {
        tokenStore.clear();
        set({ ...blank, paired: false, step: 'pairing', status: null, menu: [] });
    },

    setStatus: (status) => set({ status, online: true }),
    setMenu: (menu) => set({ menu, online: true }),
    setBanners: (banners) => set({ banners }),
    setOnline: (online) => set({ online }),

    async begin() {
        try {
            const { session_uuid } = await api.startSession(get().status?.settings?.language);
            set({ ...blank, sessionUuid: session_uuid, step: 'type' });
        } catch (error) {
            if (error instanceof ApiError && error.code === 'out_of_service') {
                // The status poll switches to the "closed" screen; nothing else to do here.
                return;
            }

            set({ notice: error instanceof ApiError && error.offline ? 'No connection. Please ask the staff for help.' : 'We could not start your order. Please try again.' });
        }
    },

    chooseType: (type) => set({ orderType: type, step: 'menu' }),
    goto: (step) => set({ step }),

    addLine(product, variant, modifiers, quantity) {
        const key = lineKey(product.id, variant?.id ?? null, modifiers);
        const lines = get().lines;
        const existing = lines.find((l) => l.key === key);

        set({
            // A changed cart means the suggestions may be different: ask again at checkout.
            upsellDone: false,
            lines: existing ? lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(99, l.quantity + quantity) } : l)) : [...lines, { key, product, variant, modifiers, quantity }],
        });
    },

    setQuantity(key, quantity) {
        set({ lines: get().lines.flatMap((l) => (l.key !== key ? [l] : quantity <= 0 ? [] : [{ ...l, quantity: Math.min(99, quantity) }])), upsellDone: false });
    },

    setSeniorPwd: (seniorPwd) => set({ seniorPwd }),

    /** From the cart: show suggestions once, then place the order. */
    async checkout() {
        const { lines, status, upsellDone, menu } = get();

        if (lines.length === 0) return;

        if (!upsellDone && status?.settings?.upsell_enabled) {
            try {
                const wanted = await api.upsell(lines.map((l) => l.product.id));
                const known = new Set(menu.flatMap((c) => c.products.filter((p) => p.is_available).map((p) => p.id)));
                const suggestions = wanted.filter((s) => known.has(s.product_id));

                set({ upsellDone: true, suggestions });

                if (suggestions.length > 0) {
                    set({ step: 'upsell' });

                    return;
                }
            } catch {
                // Suggestions are a bonus. Never block the order because they failed.
                set({ upsellDone: true });
            }
        }

        await get().place();
    },

    async place() {
        const { sessionUuid, orderType, lines, seniorPwd, placing } = get();

        if (!sessionUuid || !orderType || lines.length === 0 || placing) return;

        set({ placing: true });

        try {
            const placed = await api.placeOrder({
                session_uuid: sessionUuid,
                type: orderType,
                senior_pwd: seniorPwd,
                items: lines.map((l) => ({ product_id: l.product.id, variant_id: l.variant?.id ?? null, quantity: l.quantity, modifiers: l.modifiers.map((m) => m.id) })),
            });

            set({ placed, step: 'done', placing: false });
        } catch (error) {
            const message =
                error instanceof ApiError
                    ? error.code === 'session_ended'
                        ? 'Your session ended. Please start again.'
                        : error.status === 422
                          ? 'Something in your order is no longer available. Please check your items.'
                          : error.offline
                            ? 'No connection. Please try again in a moment.'
                            : error.message
                    : 'We could not place your order. Please try again.';

            set({ placing: false, notice: message, step: error instanceof ApiError && error.code === 'session_ended' ? 'welcome' : 'cart' });
        }
    },

    reset(reason) {
        const { sessionUuid, placed, lines } = get();

        // Walking away with no order: tell the server so the session is counted as abandoned.
        if (sessionUuid && !placed && reason) {
            api.endSession(sessionUuid, reason, cartCount(lines)).catch(() => undefined);
        }

        set({ ...blank, step: 'welcome' });
    },

    dismissNotice: () => set({ notice: null }),
}));
