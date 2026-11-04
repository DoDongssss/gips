import { useEffect, useRef, useState } from 'react';

import { ApiError, api, onAuthLost } from '@/lib/kiosk/api';
import { useKiosk } from '@/stores/kiosk-store';

const MENU_MS = 15_000;
const HEARTBEAT_MS = 30_000;
const BANNER_MS = 60_000;
const WARN_SECONDS = 10;

function useEvery(task: () => Promise<void>, ms: number, enabled: boolean): void {
    const latest = useRef(task);
    latest.current = task;

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let stopped = false;
        const run = () => {
            if (!stopped) {
                void latest.current().catch(() => undefined);
            }
        };

        run();
        const timer = window.setInterval(run, ms);

        return () => {
            stopped = true;
            window.clearInterval(timer);
        };
    }, [ms, enabled]);
}

export function useKioskSync(): void {
    const paired = useKiosk((s) => s.paired);

    useEffect(() => {
        onAuthLost(() => useKiosk.getState().unpair());
    }, []);

    const guard = async (work: () => Promise<void>) => {
        try {
            await work();
            useKiosk.getState().setOnline(true);
        } catch (error) {
            if (error instanceof ApiError && error.offline) {
                useKiosk.getState().setOnline(false);
            }
        }
    };

    useEffect(() => {
        if (!paired) {
            return;
        }

        void guard(async () => {
            useKiosk.getState().setStatus(await api.status());
            useKiosk.getState().setMenu(await api.menu());
        });
    }, [paired]);

    useEvery(() => guard(async () => useKiosk.getState().setMenu(await api.menu())), MENU_MS, paired);
    useEvery(() => guard(async () => useKiosk.getState().setBanners(await api.banners())), BANNER_MS, paired);
    useEvery(
        () =>
            guard(async () => {
                const status = await api.heartbeat(useKiosk.getState().sessionUuid ? 'busy' : 'online');
                useKiosk.getState().setStatus(status);
            }),
        HEARTBEAT_MS,
        paired,
    );
}

export function useKioskIdle(active: boolean, timeoutSeconds: number, onReset: () => void): number | null {
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
