import { useEffect, useRef, useState } from 'react';

import { ApiError, api, onAuthLost } from '@/kiosk/api';
import { useKiosk } from '@/kiosk/store';

/** Poll cadence. The plan: remote changes (out of service, sold out) apply within about 15 seconds. */
const STATUS_MS = 15_000;
const HEARTBEAT_MS = 30_000;
const BANNER_MS = 60_000;

/** Run `task` now and then every `ms`, until the component goes away. A failing task never stops the loop. */
function useEvery(task: () => Promise<void>, ms: number, enabled: boolean): void {
    const latest = useRef(task);
    latest.current = task;

    useEffect(() => {
        if (!enabled) return;

        let stopped = false;
        const run = () => {
            if (!stopped) void latest.current().catch(() => undefined);
        };

        run();
        const timer = window.setInterval(run, ms);

        return () => {
            stopped = true;
            window.clearInterval(timer);
        };
    }, [ms, enabled]);
}

/** Everything the tablet keeps in sync with the server while it is paired. */
export function useKioskSync(): void {
    const paired = useKiosk((s) => s.paired);

    // A revoked token sends the tablet back to the pairing screen.
    useEffect(() => {
        onAuthLost(() => useKiosk.getState().unpair());
    }, []);

    const guard = async (work: () => Promise<void>) => {
        try {
            await work();
            useKiosk.getState().setOnline(true);
        } catch (error) {
            if (error instanceof ApiError && error.offline) useKiosk.getState().setOnline(false);
            // Other errors (a 423, a 500) leave the last known state in place.
        }
    };

    useEvery(() => guard(async () => useKiosk.getState().setStatus(await api.status())), STATUS_MS, paired);
    useEvery(() => guard(async () => useKiosk.getState().setMenu(await api.menu())), STATUS_MS, paired);
    useEvery(() => guard(async () => useKiosk.getState().setBanners(await api.banners())), BANNER_MS, paired);
    useEvery(
        () => guard(async () => void (await api.heartbeat(useKiosk.getState().sessionUuid ? 'busy' : 'online'))),
        HEARTBEAT_MS,
        paired,
    );
}

/** The warning shows this many seconds before the kiosk resets itself. */
const WARN_SECONDS = 10;

/**
 * Idle reset. After `timeoutSeconds` with no touch a countdown appears; any touch cancels it, otherwise
 * `onReset` runs. Returns the seconds left while the warning is showing, else null.
 */
export function useIdle(active: boolean, timeoutSeconds: number, onReset: () => void): number | null {
    const [left, setLeft] = useState<number | null>(null);
    const last = useRef(Date.now());
    const reset = useRef(onReset);
    reset.current = onReset;

    useEffect(() => {
        if (!active) {
            setLeft(null);

            return;
        }

        last.current = Date.now();
        const touch = () => {
            last.current = Date.now();
            setLeft(null);
        };

        const events = ['pointerdown', 'touchstart', 'keydown'] as const;
        events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

        const timer = window.setInterval(() => {
            const idle = (Date.now() - last.current) / 1000;
            const remaining = Math.ceil(timeoutSeconds + WARN_SECONDS - idle);

            if (remaining <= 0) {
                setLeft(null);
                last.current = Date.now();
                reset.current();
            } else if (idle >= timeoutSeconds) {
                setLeft(remaining);
            }
        }, 500);

        return () => {
            events.forEach((e) => window.removeEventListener(e, touch));
            window.clearInterval(timer);
            setLeft(null);
        };
    }, [active, timeoutSeconds]);

    return left;
}
