import type { Banner, Category, OrderType, PlacedOrder, Status, Suggestion } from '@/kiosk/types';

const BASE = '/api/v1/kiosk';
const TOKEN_KEY = 'gip-kiosk-token';

/** The tablet's own token. Kept on the device; never a staff login. */
export const tokenStore = {
    get(): string | null {
        try {
            return window.localStorage.getItem(TOKEN_KEY);
        } catch {
            return null;
        }
    },
    set(token: string): void {
        try {
            window.localStorage.setItem(TOKEN_KEY, token);
        } catch {
            // Private mode or blocked storage: the tablet will ask to pair again after a reload.
        }
    },
    clear(): void {
        try {
            window.localStorage.removeItem(TOKEN_KEY);
        } catch {
            // nothing to clear
        }
    },
};

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public code?: string,
        public errors?: Record<string, string[]>,
    ) {
        super(message);
    }

    /** No connection at all (status 0). */
    get offline(): boolean {
        return this.status === 0;
    }
}

let authLost: (() => void) | null = null;

/** Called when the server says this token no longer works (device switched off, signed out, deleted). */
export function onAuthLost(handler: () => void): void {
    authLost = handler;
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown, auth = true): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = tokenStore.get();

    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    try {
        response = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'omit', cache: 'no-store' });
    } catch {
        throw new ApiError(0, 'No connection', 'network');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let json: any = null;
    try {
        json = await response.json();
    } catch {
        // an empty or non-JSON body
    }

    if (!response.ok) {
        if (auth && (response.status === 401 || response.status === 403)) authLost?.();

        throw new ApiError(response.status, json?.message ?? 'Something went wrong', json?.code, json?.errors);
    }

    return (json?.data ?? json) as T;
}

export const api = {
    pair: (code: string) => request<{ token: string } & Status>('POST', '/pair', { code, app_version: 'web-1' }, false),
    status: () => request<Status>('GET', '/status'),
    heartbeat: (status: 'online' | 'busy') => request<Status>('POST', '/heartbeat', { status, app_version: 'web-1' }),
    menu: () => request<Category[]>('GET', '/menu'),
    banners: () => request<Banner[]>('GET', '/screens'),
    upsell: (productIds: number[]) => request<Suggestion[]>('POST', '/upsell', { product_ids: productIds }),
    startSession: (language?: string) => request<{ session_uuid: string }>('POST', '/sessions', { language }),
    endSession: (uuid: string, status: 'abandoned' | 'timed_out', itemsCount: number) => request<{ ok: boolean }>('POST', `/sessions/${uuid}/end`, { status, items_count: itemsCount }),
    placeOrder: (payload: { session_uuid: string; type: OrderType; senior_pwd: boolean; items: { product_id: number; variant_id: number | null; quantity: number; modifiers: number[] }[] }) =>
        request<PlacedOrder>('POST', '/orders', payload),
};
