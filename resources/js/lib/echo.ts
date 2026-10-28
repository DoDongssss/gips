import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

let instance: Echo<'pusher'> | null | undefined;

function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

/** One shared Echo connection. Returns null when VITE_PUSHER_APP_KEY is not set, so the app falls back to polling. */
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
            headersProvider: () => ({ 'X-XSRF-TOKEN': xsrfToken(), Accept: 'application/json' }),
        },
    } as never) as Echo<'pusher'>;

    if (import.meta.env.DEV) {
        const { connection } = (instance.connector as unknown as { pusher: Pusher }).pusher;

        console.info('[pusher] starting, cluster:', import.meta.env.VITE_PUSHER_APP_CLUSTER ?? '(VITE_PUSHER_APP_CLUSTER not set, using ap1)');
        connection.bind('state_change', (s: { previous: string; current: string }) => console.info(`[pusher] ${s.previous} -> ${s.current}`));
        connection.bind('error', (e: unknown) => console.warn('[pusher] error', e));
    }

    return instance;
}