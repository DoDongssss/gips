import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { useKiosk } from '@/kiosk/store';

/** Full-screen layout for the kiosk tablet: no sidebar, no header, the page gets the whole screen. */
export default function KioskLayout({ children }: PropsWithChildren) {
    const paired = useKiosk((s) => s.paired);
    const online = useKiosk((s) => s.online);
    const largeText = useKiosk((s) => s.status?.settings?.large_text === true);

    // Dialogs render in portals, so the larger text size is applied on <html>.
    useEffect(() => {
        document.documentElement.style.fontSize = largeText ? '125%' : '';

        return () => {
            document.documentElement.style.fontSize = '';
        };
    }, [largeText]);

    return (
        <div className="bg-background flex h-svh w-full touch-manipulation flex-col overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
            {paired && !online && (
                <div role="alert" className="bg-amber-500 px-4 py-1.5 text-center text-sm font-medium text-white">
                    No connection. Retrying…
                </div>
            )}
            <main className="relative min-h-0 flex-1">{children}</main>
        </div>
    );
}
