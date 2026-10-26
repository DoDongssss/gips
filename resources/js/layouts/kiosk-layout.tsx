import { WifiOff } from 'lucide-react';
import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { useKiosk } from '@/kiosk/store';

/**
 * Full-screen layout for the kiosk: no sidebar, no header, the page gets the whole screen.
 *
 * Everything is sized in rem, so the root font size scales the whole UI to the screen: 1x on a tablet
 * (800px short side), larger on a big display, and 1.25x more when "large text" is on.
 * Dialogs render in portals, so it is set on <html>.
 */
export default function KioskLayout({ children }: PropsWithChildren) {
    const paired = useKiosk((s) => s.paired);
    const online = useKiosk((s) => s.online);
    const largeText = useKiosk((s) => s.status?.settings?.large_text === true);

    useEffect(() => {
        const apply = () => {
            const shortSide = Math.min(window.innerWidth, window.innerHeight);
            const scale = Math.min(2.5, Math.max(1, shortSide / 800)) * (largeText ? 1.25 : 1);

            document.documentElement.style.fontSize = `${16 * scale}px`;
        };

        apply();
        window.addEventListener('resize', apply);

        return () => {
            window.removeEventListener('resize', apply);
            document.documentElement.style.fontSize = '';
        };
    }, [largeText]);

    return (
        <div className="bg-background flex h-svh w-full touch-manipulation flex-col overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
            {paired && !online && (
                <div role="alert" className="bg-warning text-warning-foreground flex items-center justify-center gap-2 px-4 py-2 text-center text-base font-medium">
                    <WifiOff className="size-4" />
                    No connection. Retrying…
                </div>
            )}
            <main className="relative min-h-0 flex-1">{children}</main>
        </div>
    );
}
