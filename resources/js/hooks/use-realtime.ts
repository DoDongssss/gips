import { useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { useEffect } from 'react';

type EchoChannel = { listen: (event: string, callback: () => void) => EchoChannel };
type EchoLike = { private: (name: string) => EchoChannel; leave: (name: string) => void };

/**
 * Refetches a query the moment the server broadcasts on a private channel.
 * `window.Echo` is created once Reverb is installed; until then this does nothing
 * and the query's own polling keeps the screen current.
 */
export function useRealtimeRefetch(channel: string, event: string, queryKey: QueryKey): void {
    const queryClient = useQueryClient();
    const key = JSON.stringify(queryKey);

    useEffect(() => {
        const echo = (window as unknown as { Echo?: EchoLike }).Echo;

        if (!echo) {
            return;
        }

        echo.private(channel).listen(`.${event}`, () => {
            void queryClient.invalidateQueries({ queryKey: JSON.parse(key) as QueryKey });
        });

        return () => echo.leave(channel);
    }, [channel, event, key, queryClient]);
}
