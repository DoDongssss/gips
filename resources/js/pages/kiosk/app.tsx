import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import KioskLayout from '@/layouts/kiosk-layout';
import { useKioskIdle, useKioskSync } from '@/hooks/kiosk/use-kiosk';
import CartScreen from '@/pages/kiosk/cart';
import ClosedScreen from '@/pages/kiosk/closed';
import DoneScreen from '@/pages/kiosk/done';
import MenuScreen from '@/pages/kiosk/menu';
import OrderTypeScreen from '@/pages/kiosk/order-type';
import { IdleWarning, NoticeDialog } from '@/components/kiosk/overlays';
import PairingScreen from '@/pages/kiosk/pairing';
import UpsellScreen from '@/pages/kiosk/upsell-screen';
import WelcomeScreen from '@/pages/kiosk/welcome';
import { useKiosk } from '@/stores/kiosk-store';

const ACTIVE = ['type', 'menu', 'cart', 'upsell'];

export default function KioskApp() {
    useKioskSync();

    // The tablet's state (pairing token) lives in localStorage, so render only after mount to match the server HTML.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const step = useKiosk((s) => s.step);
    const paired = useKiosk((s) => s.paired);
    const status = useKiosk((s) => s.status);
    const notice = useKiosk((s) => s.notice);
    const { reset, dismissNotice } = useKiosk.getState();

    const settings = status?.settings ?? null;
    const closed = settings?.is_out_of_service === true && step !== 'done';
    const idleLeft = useKioskIdle(paired && !closed && ACTIVE.includes(step), settings?.idle_timeout_seconds ?? 90, () => reset('timed_out'));

    // Going out of service mid-order drops the order, so nothing is left half-built.
    useEffect(() => {
        if (closed && ACTIVE.includes(step)) reset('abandoned');
    }, [closed, step, reset]);

    let screen: ReactNode;
    if (!paired) screen = <PairingScreen />;
    else if (closed) screen = <ClosedScreen message={settings?.welcome_message} />;
    else {
        screen = {
            pairing: <PairingScreen />,
            welcome: <WelcomeScreen />,
            type: <OrderTypeScreen />,
            menu: <MenuScreen />,
            cart: <CartScreen />,
            upsell: <UpsellScreen />,
            done: <DoneScreen />,
        }[step];
    }

    return (
        <>
            <Head title="Kiosk" />
            {mounted && screen}
            {idleLeft !== null && <IdleWarning seconds={idleLeft} onContinue={() => window.dispatchEvent(new Event('pointerdown'))} />}
            {notice && <NoticeDialog message={notice} onClose={dismissNotice} />}
        </>
    );
}

// Full-screen layout, like the register.
KioskApp.layout = (page: ReactNode) => <KioskLayout>{page}</KioskLayout>;
