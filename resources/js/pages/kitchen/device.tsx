import { Head } from '@inertiajs/react';
import { MonitorSmartphone, LogOut } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';

import { KdsBoard } from '@/components/kitchen/kds-board';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-12 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        aria-label="Sign this screen out"
                        onClick={() =>
                            window.confirm('Sign this screen out? You will need a new pairing code.') && forget()
                        }
                    >
                        <LogOut className="size-6" />
                    </Button>
                }
            />
        );
    }

    return (
        <>
            <Head title="Pair kitchen screen" />

            <main className="flex flex-1 items-center justify-center p-6">
                <form
                    onSubmit={submit}
                    className="w-full max-w-sm space-y-6 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm"
                >
                    <MonitorSmartphone className="mx-auto size-10 text-gray-400" />
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold">Pair this screen</h1>
                        <p className="text-gray-500">Enter the 6-digit code from Settings ? Devices.</p>
                    </div>
                    <Input
                        value={code}
                        onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                        inputMode="numeric"
                        autoComplete="off"
                        autoFocus
                        placeholder="000000"
                        aria-label="Pairing code"
                        className="h-16 text-center text-3xl tracking-[0.4em]"
                    />
                    {message && <p className="text-sm text-red-600">{message}</p>}
                    <Button type="submit" className="h-14 w-full text-lg" disabled={busy || code.length !== 6}>
                        {busy ? 'Pairing�' : 'Pair screen'}
                    </Button>
                </form>
            </main>
        </>
    );
}
