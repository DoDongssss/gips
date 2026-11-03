import { useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import type Pusher from 'pusher-js';
import { useEffect, useState } from 'react';

import { getEcho } from '@/lib/echo';

/**
 * Refetches queries the moment the server broadcasts on a private channel, using the app's single Echo
 * connection (lib/echo.ts). Pass one query key, or a list of keys (each one refetches everything that starts with it).
 * Returns true while the channel is joined, so the caller can poll less often; false when Pusher is not set up
 * or the connection is down (the queries' own polling keeps the screen current).
 * Joining or rejoining refetches once, to catch anything missed while disconnected.
 */
export function useRealtimeRefetch(channel: string, event: string, queryKeys: QueryKey | QueryKey[]): boolean {
    const queryClient = useQueryClient();
    const key = JSON.stringify(queryKeys);
    const [live, setLive] = useState(false);

    useEffect(() => {
        const echo = getEcho();

        if (!echo) {
            return;
        }

        const parsed = JSON.parse(key) as QueryKey | QueryKey[];
        const keys: QueryKey[] = Array.isArray(parsed[0]) ? (parsed as QueryKey[]) : [parsed as QueryKey];
        const refetch = () => keys.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }));
        const joined = echo.private(channel);
        const { connection } = (echo.connector as unknown as { pusher: Pusher }).pusher;
        const onState = (state: { current: string }) => {
            if (state.current !== 'connected') {
                setLive(false);
            }
        };

        joined.listen(`.${event}`, refetch);
        joined.subscribed(() => {
            setLive(true);
            refetch();
        });
        joined.error(() => setLive(false));
        connection.bind('state_change', onState);

        return () => {
            connection.unbind('state_change', onState);
            echo.leave(channel);
            setLive(false);
        };
    }, [channel, event, key, queryClient]);

    return live;
}
