import type Pusher from 'pusher-js';
import { useEffect, useRef } from 'react';

import { getEcho } from '@/lib/echo';

export type AlertKind = 'devices' | 'printers' | 'stock' | '*';

/**
 * Listens to one private alert channel. `onChange` gets the kinds that changed in that push
 * (e.g. ["devices", "stock"]), or ["*"] after a reconnect (catch up on everything).
 * Returns true when Pusher is configured, so the caller can poll more slowly.
 */
export function useAlertChannel(channelName: 'device-alerts' | 'stock-alerts', enabled: boolean, onChange: (kinds: AlertKind[]) => void): boolean {
    const echo = enabled ? getEcho() : null;
    const handler = useRef(onChange);
    handler.current = onChange;

    useEffect(() => {
        if (!echo) {
            return;
        }

        const channel = echo.private(channelName);
        const changed = (event: { kinds?: AlertKind[] }) => {
            if (import.meta.env.DEV) console.info(`[pusher] ${channelName}`, event);
            handler.current(event.kinds ?? ['*']);
        };
        const reconnected = () => handler.current(['*']);
        const { connection } = (echo.connector as unknown as { pusher: Pusher }).pusher;

        channel.listen('.changed', changed);
        connection.bind('connected', reconnected); // catch up after a dropped connection

        if (import.meta.env.DEV) {
            channel.subscribed(() => console.info(`[pusher] subscribed to private-${channelName}`));
            channel.error((e: unknown) => console.warn(`[pusher] could not join private-${channelName}`, e));
        }

        return () => {
            // Other components share this channel, so only remove this component's listeners.
            channel.stopListening('.changed', changed);
            connection.unbind('connected', reconnected);
        };
    }, [echo, channelName]);

    return echo !== null;
}
