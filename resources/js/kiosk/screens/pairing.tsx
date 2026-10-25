import { Tablet } from 'lucide-react';

import PairingScreen from '@/components/devices/pairing-screen';
import { ApiError } from '@/kiosk/api';
import { useKiosk } from '@/kiosk/store';

/** Shown once, by staff, on a tablet that has not been paired yet. Same screen as the kitchen display. */
export default function Pairing() {
    const pair = useKiosk((s) => s.pair);

    return (
        <PairingScreen
            icon={Tablet}
            title="Set up this kiosk"
            description="Staff only. In the back office open Settings → Devices and get a code for this kiosk."
            buttonLabel="Pair this kiosk"
            onPair={(code) => pair(code)}
            errorMessage={(e) => (e instanceof ApiError ? (e.errors?.code?.[0] ?? e.message) : 'Could not reach the server.')}
        />
    );
}
