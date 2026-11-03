import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import KioskLayout from '@/layouts/kiosk-layout';
import { useIdle, useKioskSync } from '@/kiosk/hooks';
import CartScreen from '@/kiosk/screens/cart';
import ClosedScreen from '@/kiosk/screens/closed';
import DoneScreen from '@/kiosk/screens/done';
import MenuScreen from '@/kiosk/screens/menu';
import OrderTypeScreen from '@/kiosk/screens/order-type';
import { IdleWarning, NoticeDialog } from '@/kiosk/screens/overlays';
import PairingScreen from '@/kiosk/screens/pairing';
import UpsellScreen from '@/kiosk/screens/upsell';
import WelcomeScreen from '@/kiosk/screens/welcome';
import { useKiosk } from '@/kiosk/store';

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
    const idleLeft = useIdle(paired && !closed && ACTIVE.includes(step), settings?.idle_timeout_seconds ?? 90, () => reset('timed_out'));

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
