import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { OrdersDrawer } from '@/components/pos/orders-drawer';
import { PosHeader } from '@/components/pos/pos-header';
import { useOnlineStatus } from '@/hooks/use-online-status';

/** Full-screen layout for the register: a slim header and the rest of the screen for the page. */
export default function PosLayout({ children }: PropsWithChildren) {
    const isOnline = useOnlineStatus();

    // Dialogs and sheets render in portals, so the compact radius is applied on <html>.
    useEffect(() => {
        document.documentElement.classList.add('pos-compact');

        return () => document.documentElement.classList.remove('pos-compact');
    }, []);

    return (
        <div className="flex bg-gray-50 h-svh w-full flex-col overflow-hidden">
            <PosHeader />
            {!isOnline && (
                <div role="alert" className="bg-amber-500 px-4 py-1.5 text-center text-sm font-medium text-white">
                    You are offline. Orders and payments cannot be saved until the connection returns.
                </div>
            )}
            <main className="relative min-h-0 flex-1">{children}</main>
            <OrdersDrawer />
        </div>
    );
}
