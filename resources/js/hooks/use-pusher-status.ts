import type Pusher from 'pusher-js';
import { useEffect, useState } from 'react';

import { getEcho } from '@/lib/echo';

/** True when Pusher is configured and connected. */
export function usePusherStatus(): 'off' | 'connecting' | 'live' {
    const [status, setStatus] = useState<'off' | 'connecting' | 'live'>(() => (getEcho() ? 'connecting' : 'off'));

    useEffect(() => {
        const echo = getEcho();
        if (!echo) {
            setStatus('off');
            return;
        }

        const { connection } = (echo.connector as unknown as { pusher: Pusher }).pusher;
        const sync = () => {
            setStatus(connection.state === 'connected' ? 'live' : 'connecting');
        };

        sync();
        connection.bind('state_change', sync);

        return () => connection.unbind('state_change', sync);
    }, []);

    return status;
}
