import type { LucideIcon } from 'lucide-react';
import { MonitorSmartphone } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

type Props = {
    title: string;
    description: string;
    /** Trades the code for a token. Throw to show an error under the input. */
    onPair: (code: string) => Promise<void>;
    /** Turns whatever onPair threw into the text shown to the person. */
    errorMessage?: (error: unknown) => string;
    icon?: LucideIcon;
    buttonLabel?: string;
};

/**
 * The pairing screen for every paired device (kiosk tablet, kitchen screen): one card, one code field.
 * The code is the 8-character one from Settings > Devices.
 */
export default function PairingScreen({
    title,
    description,
    onPair,
    errorMessage = () => 'Could not pair. Check the code and try again.',
    icon: Icon = MonitorSmartphone,
    buttonLabel = 'Pair screen',
}: Props) {
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    async function submit(event: FormEvent) {
        event.preventDefault();
        setBusy(true);
        setMessage(null);

        try {
            await onPair(code);
            setCode('');
        } catch (error) {
            setMessage(errorMessage(error));
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="flex min-h-dvh flex-1 items-center justify-center bg-slate-200 p-6">
            <form onSubmit={submit} className="w-full max-w-sm space-y-6 overflow-hidden rounded-lg bg-white text-center shadow-md">
                <div className="bg-slate-900 px-8 py-6 text-white">
                    <Icon className="mx-auto mb-2 size-10" />
                    <h1 className="text-2xl font-bold">{title}</h1>
                    <p className="mt-1 text-slate-300">{description}</p>
                </div>

                <div className="space-y-4 px-8 pb-8">
                    <input
                        value={code}
                        onChange={(event) => setCode(event.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8))}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        autoFocus
                        placeholder="ABCD2345"
                        aria-label="Pairing code"
                        className="h-16 w-full rounded-md bg-slate-100 text-center font-mono text-3xl tracking-[0.25em] text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    {message && <p className="text-sm font-medium text-red-600">{message}</p>}
                    <button
                        type="submit"
                        disabled={busy || code.length < 6}
                        className="h-14 w-full rounded-md bg-slate-900 text-lg font-semibold text-white disabled:opacity-40 active:bg-slate-700"
                    >
                        {busy ? 'Pairing…' : buttonLabel}
                    </button>
                </div>
            </form>
        </main>
    );
}
