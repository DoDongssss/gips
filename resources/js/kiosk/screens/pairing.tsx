import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiError } from '@/kiosk/api';
import { useKiosk } from '@/kiosk/store';
import { BigButton, Frame } from '@/kiosk/screens/ui';

/** Shown once, by staff, on a tablet that has not been paired yet. */
export default function Pairing() {
    const pair = useKiosk((s) => s.pair);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(event: FormEvent) {
        event.preventDefault();
        setBusy(true);
        setError(null);

        try {
            await pair(code);
        } catch (e) {
            setError(e instanceof ApiError ? (e.errors?.code?.[0] ?? e.message) : 'Could not reach the server.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <Frame className="items-center justify-center p-8">
            <form onSubmit={submit} className="w-full max-w-md space-y-6 text-center">
                <div>
                    <h1 className="text-3xl font-bold">Set up this kiosk</h1>
                    <p className="text-muted-foreground mt-2">Staff only. In the back office, open Kiosk, then Devices, and add or choose this device to get a code.</p>
                </div>

                <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    autoFocus
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={12}
                    placeholder="PAIRING CODE"
                    aria-label="Pairing code"
                    className="border-input bg-background w-full rounded-2xl border-2 px-4 py-4 text-center font-mono text-3xl tracking-[0.3em] outline-none focus:border-primary"
                />

                {error && <p className="text-destructive text-sm">{error}</p>}

                <BigButton type="submit" disabled={busy || code.trim().length < 6} className="w-full">
                    {busy ? 'Pairing…' : 'Pair this kiosk'}
                </BigButton>
            </form>
        </Frame>
    );
}
