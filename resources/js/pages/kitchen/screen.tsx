import { Head } from '@inertiajs/react';
import { ChefHat, LogOut } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import PairingScreen from '@/components/devices/pairing-screen';
import { KdsBoard } from '@/components/kitchen/kds-board';
import { errorList, posPost } from '@/lib/pos-http';

type Paired = { token: string; station: { id: number; name: string; type?: string }; device: { name: string } };

const STORAGE_KEY = 'kitchen.device';

function readPaired(): Paired | null {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Paired | null;
    } catch {
        return null;
    }
}

/**
 * The kitchen tablet page at /kitchen. Public: no staff login. It pairs once with the code from
 * Settings > Devices, then keeps working on its own device token.
 */
export default function KitchenScreen() {
    // localStorage is not there on the server: read it after mount so server and browser agree.
    const [ready, setReady] = useState(false);
    const [paired, setPaired] = useState<Paired | null>(null);

    useEffect(() => {
        setPaired(readPaired());
        setReady(true);
    }, []);

    const forget = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // ignore
        }
        setPaired(null);
    }, []);

    async function pair(code: string) {
        const response = await posPost<{ data: Paired }>('/api/v1/devices/pair', { code });

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(response.data));
        } catch {
            // still works until the page is closed
        }
        setPaired(response.data);
    }

    if (!ready) {
        return <Head title="Kitchen screen" />;
    }

    if (paired) {
        return (
            <KdsBoard
                station={{ ...paired.station, type: paired.station.type ?? 'other' }}
                token={paired.token}
                onUnauthorized={forget}
                leading={
                    <button
                        type="button"
                        aria-label="Sign this screen out"
                        onClick={() => window.confirm('Sign this screen out? You will need a new pairing code.') && forget()}
                        className="flex size-12 items-center justify-center rounded-md bg-white text-slate-900 shadow active:bg-gray-100"
                    >
                        <LogOut className="size-6" />
                    </button>
                }
            />
        );
    }

    return (
        <>
            <Head title="Pair kitchen screen" />

            <PairingScreen
                icon={ChefHat}
                title="Pair this screen"
                description="Enter the code from Settings → Devices."
                onPair={pair}
                errorMessage={(error) => errorList(error)[0]}
            />
        </>
    );
}
