import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

let instance: Echo<'pusher'> | null | undefined;

function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

/** The paired kitchen screen keeps its device token here (see pages/kitchen/screen.tsx). */
function deviceToken(): string | null {
    try {
        return (JSON.parse(localStorage.getItem('kitchen.device') ?? 'null') as { token?: string } | null)?.token ?? null;
    } catch {
        return null;
    }
}

/**
 * The ONE Echo connection for the whole app (also available as window.Echo).
 * Staff are recognised by their session; a paired kitchen screen adds its device token.
 * Returns null when VITE_PUSHER_APP_KEY is not set, so the app falls back to polling.
 */
export function getEcho(): Echo<'pusher'> | null {
    // Inertia renders pages on the server too (SSR), where there is no window. Nothing to connect to there.
    if (typeof window === 'undefined') {
        return null;
    }

    if (instance !== undefined) {
        return instance;
    }

    const key = import.meta.env.VITE_PUSHER_APP_KEY as string | undefined;

    if (!key) {
        instance = null;

        return null;
    }

    (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

    instance = new Echo({
        broadcaster: 'pusher',
        key,
        cluster: (import.meta.env.VITE_PUSHER_APP_CLUSTER as string | undefined) ?? 'ap1',
        forceTLS: true,
        channelAuthorization: {
            endpoint: '/broadcasting/auth',
            transport: 'ajax',
            // Read on every join, so a screen that pairs after the page loaded still authorises.
            headersProvider: () => {
                const token = deviceToken();

                return {
                    'X-XSRF-TOKEN': xsrfToken(),
                    Accept: 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                };
            },
        },
    } as never) as Echo<'pusher'>;

    (window as unknown as { Echo: Echo<'pusher'> }).Echo = instance;

    if (import.meta.env.DEV) {
        const { connection } = (instance.connector as unknown as { pusher: Pusher }).pusher;

        console.info('[pusher] starting, cluster:', import.meta.env.VITE_PUSHER_APP_CLUSTER ?? '(VITE_PUSHER_APP_CLUSTER not set, using ap1)');
        connection.bind('state_change', (s: { previous: string; current: string }) => console.info(`[pusher] ${s.previous} -> ${s.current}`));
        connection.bind('error', (e: unknown) => console.warn('[pusher] error', e));
    }

    return instance;
}
