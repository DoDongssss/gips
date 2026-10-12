import { errorMessages, fieldError } from '@/lib/api';

/**
 * Small fetch helpers for the register's own calls (payments, "my orders").
 * Session cookie + XSRF header, JSON in and out, Laravel validation errors kept as-is.
 */
export class PosHttpError extends Error {
    constructor(
        public status: number,
        message: string,
        public errors: Record<string, string[]> = {},
    ) {
        super(message);
    }
}

const xsrfToken = (): string => {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
};

async function request<T>(method: string, url: string, body?: unknown, extra: Record<string, string> = {}): Promise<T> {
    const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': xsrfToken(),
            ...extra,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new PosHttpError(response.status, payload?.message ?? 'Something went wrong. Please try again.', payload?.errors ?? {});
    }

    return payload as T;
}

export const posGet = <T>(url: string): Promise<T> => request<T>('GET', url);

export const posPost = <T>(url: string, body: unknown, idempotencyKey?: string): Promise<T> =>
    request<T>('POST', url, body, idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {});

/** Readable messages for any error: ours, or one thrown by @/lib/pos-api. */
export function errorList(error: unknown): string[] {
    if (error instanceof PosHttpError) {
        const all = Object.values(error.errors).flat();

        return all.length > 0 ? [...new Set(all)] : [error.message];
    }

    return errorMessages(error);
}

export function errorFor(error: unknown, field: string): string | undefined {
    if (error instanceof PosHttpError) {
        return error.errors[field]?.[0];
    }

    return fieldError(error, field);
}
