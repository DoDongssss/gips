import { Head } from '@inertiajs/react';
import { LogOut, MonitorSmartphone } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';

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

/** A kitchen tablet: no staff login. It pairs once with a code from the owner, then stays signed in. */
export default function Device() {
    const [paired, setPaired] = useState<Paired | null>(readPaired);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const forget = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setPaired(null);
    }, []);

    async function submit(event: FormEvent) {
        event.preventDefault();
        setBusy(true);
        setMessage(null);

        try {
            const response = await posPost<{ data: Paired }>('/api/v1/devices/pair', { code });

            localStorage.setItem(STORAGE_KEY, JSON.stringify(response.data));
            setPaired(response.data);
            setCode('');
        } catch (error) {
            setMessage(errorList(error)[0]);
        } finally {
            setBusy(false);
        }
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
                        onClick={() =>
                            window.confirm('Sign this screen out? You will need a new pairing code.') && forget()
                        }
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

            <main className="flex min-h-dvh flex-1 items-center justify-center bg-slate-200 p-6">
                <form
                    onSubmit={submit}
                    className="w-full max-w-sm space-y-6 overflow-hidden rounded-lg bg-white text-center shadow-md"
                >
                    <div className="bg-slate-900 px-8 py-6 text-white">
                        <MonitorSmartphone className="mx-auto mb-2 size-10" />
                        <h1 className="text-2xl font-bold">Pair this screen</h1>
                        <p className="mt-1 text-slate-300">Enter the 6-digit code from Settings → Devices.</p>
                    </div>

                    <div className="space-y-4 px-8 pb-8">
                        <input
                            value={code}
                            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                            inputMode="numeric"
                            autoComplete="off"
                            autoFocus
                            placeholder="000000"
                            aria-label="Pairing code"
                            className="h-16 w-full rounded-md bg-slate-100 text-center text-3xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-slate-900"
                        />
                        {message && <p className="text-sm font-medium text-red-600">{message}</p>}
                        <button
                            type="submit"
                            disabled={busy || code.length !== 6}
                            className="h-14 w-full rounded-md bg-slate-900 text-lg font-semibold text-white disabled:opacity-40 active:bg-slate-700"
                        >
                            {busy ? 'Pairing…' : 'Pair screen'}
                        </button>
                    </div>
                </form>
            </main>
        </>
    );
}