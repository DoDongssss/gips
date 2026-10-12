import type { PropsWithChildren } from 'react';

import { InertiaToasts } from '@/components/inertia-toast';

/** Full-screen, no sidebar: the kitchen screens fill the whole display. */
export default function KitchenLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex h-svh w-full flex-col overflow-hidden bg-gray-50 text-gray-900">
            {children}
            <InertiaToasts />
        </div>
    );
}
