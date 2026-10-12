/**
 * Small fetch wrapper for JSON endpoints that live outside Inertia
 * (live POS data, KDS, kiosk, "generate once" actions).
 *
 * Handles the Laravel CSRF cookie, JSON headers and error shapes.
 * Use it as the queryFn / mutationFn in TanStack Query.
 */

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiOptions = {
    method?: Method;
    body?: unknown;
    signal?: AbortSignal;
    /** Extra headers, for example `Idempotency-Key` on order and payment calls. */
    headers?: Record<string, string>;
};

export class ApiError extends Error {
    status: number;
    errors?: Record<string, string[]>;

    constructor(status: number, message: string, errors?: Record<string, string[]>) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
    }
}

function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

export async function api<T>(url: string, { method = 'GET', body, signal, headers }: ApiOptions = {}): Promise<T> {
    const hasBody = body !== undefined;

    const response = await fetch(url, {
        method,
        signal,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': xsrfToken(),
            ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
            ...headers,
        },
        body: hasBody ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        if (response.status === 419) {
            throw new ApiError(419, 'Your session expired. Please refresh the page and try again.');
        }

        if (response.status === 403) {
            throw new ApiError(403, "You don't have permission to do that.");
        }

        let payload: { message?: string; errors?: Record<string, string[]> } = {};

        try {
            payload = await response.json();
        } catch {
            // Non-JSON error body (for example an HTML error page).
        }

        throw new ApiError(
            response.status,
            payload.message ?? `Request failed (${response.status}).`,
            payload.errors,
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return (await response.json()) as T;
}

/** Every validation message from an error, flattened, for a simple inline alert. */
export function errorMessages(error: unknown): string[] {
    if (error instanceof ApiError) {
        const all = Object.values(error.errors ?? {}).flat();

        return all.length > 0 ? all : [error.message];
    }

    return error instanceof Error ? [error.message] : ['Something went wrong. Please try again.'];
}

/** The first message for one field, or any field starting with the given key (e.g. `approval`). */
export function fieldError(error: unknown, key: string): string | undefined {
    if (!(error instanceof ApiError) || !error.errors) {
        return undefined;
    }

    const match = Object.entries(error.errors).find(([name]) => name === key || name.startsWith(`${key}.`));

    return match?.[1][0];
}
