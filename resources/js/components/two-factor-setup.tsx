import { router } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
    enabled: boolean;
    requiresConfirmation: boolean;
};

type Result<T> = { ok: boolean; status: number; data: T | null };

const CONFIRM_PASSWORD_URL = '/user/confirm-password';

function xsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

async function request<T>(method: 'GET' | 'POST' | 'DELETE', url: string, body?: Record<string, string>): Promise<Result<T>> {
    try {
        const response = await fetch(url, {
            method,
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': xsrfToken(),
                ...(body ? { 'Content-Type': 'application/json' } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        // Fortify asks for a recent password confirmation before sensitive actions.
        if (response.status === 423) {
            window.location.href = CONFIRM_PASSWORD_URL;

            return { ok: false, status: 423, data: null };
        }

        const text = await response.text();
        let data: T | null = null;

        try {
            data = text ? (JSON.parse(text) as T) : null;
        } catch {
            data = null;
        }

        return { ok: response.ok, status: response.status, data };
    } catch {
        return { ok: false, status: 0, data: null };
    }
}

function firstError(data: unknown, field: string): string | null {
    const message = (data as { errors?: Record<string, unknown> } | null)?.errors?.[field];
    const value = Array.isArray(message) ? message[0] : message;

    return typeof value === 'string' ? value : null;
}

export default function TwoFactorSetup({ enabled, requiresConfirmation }: Props) {
    const [qr, setQr] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [codes, setCodes] = useState<string[]>([]);
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const loadSetup = useCallback(async () => {
        const qrResult = await request<{ svg?: string }>('GET', '/user/two-factor-qr-code');
        const keyResult = await request<{ secretKey?: string }>('GET', '/user/two-factor-secret-key');

        setQr(typeof qrResult.data?.svg === 'string' ? qrResult.data.svg : null);
        setSecret(typeof keyResult.data?.secretKey === 'string' ? keyResult.data.secretKey : null);
    }, []);

    const loadCodes = useCallback(async () => {
        const result = await request<Array<string | { code?: string }>>('GET', '/user/two-factor-recovery-codes');
        const list = Array.isArray(result.data) ? result.data : [];

        setCodes(list.map((item) => (typeof item === 'string' ? item : (item?.code ?? ''))).filter(Boolean));
    }, []);

    useEffect(() => {
        if (enabled) {
            setQr(null);
            setSecret(null);
            void loadCodes();
        } else {
            setCodes([]);
            void loadSetup();
        }
    }, [enabled, loadSetup, loadCodes]);

    const run = async (action: () => Promise<void>) => {
        setBusy(true);
        setError(null);

        try {
            await action();
        } finally {
            setBusy(false);
        }
    };

    const enable = () =>
        run(async () => {
            const result = await request('POST', '/user/two-factor-authentication');

            if (!result.ok) {
                if (result.status !== 423) {
                    setError('Could not start two-factor setup. Please try again.');
                }

                return;
            }

            if (requiresConfirmation) {
                await loadSetup();
            } else {
                router.reload();
            }
        });

    const confirm = () =>
        run(async () => {
            const result = await request('POST', '/user/confirmed-two-factor-authentication', { code });

            if (!result.ok) {
                if (result.status !== 423) {
                    setError(firstError(result.data, 'code') ?? 'The code is invalid. Please try again.');
                }

                return;
            }

            setCode('');
            router.reload();
        });

    const regenerateCodes = () =>
        run(async () => {
            const result = await request('POST', '/user/two-factor-recovery-codes');

            if (result.ok) {
                await loadCodes();
            } else if (result.status !== 423) {
                setError('Could not generate new recovery codes.');
            }
        });

    const disable = () =>
        run(async () => {
            const result = await request('DELETE', '/user/two-factor-authentication');

            if (result.ok) {
                setCodes([]);
                router.reload();
            } else if (result.status !== 423) {
                setError('Could not turn off two-factor authentication.');
            }
        });

    const hasPendingSetup = !enabled && qr !== null;

    return (
        <div className="space-y-6">
            <Heading
                variant="small"
                title="Two-factor authentication"
                description="Sign in with a 6-digit code from an authenticator app (Google Authenticator, Authy, 1Password) as well as your password."
            />

            {enabled && (
                <div className="space-y-4">
                    <p className="text-sm text-emerald-600">Two-factor authentication is on.</p>

                    {codes.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Recovery codes. Keep them somewhere safe: each one works once if you lose your phone.
                            </p>
                            <div className="grid gap-1 rounded-lg bg-muted p-4 font-mono text-sm sm:grid-cols-2">
                                {codes.map((c) => (
                                    <div key={c}>{c}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button variant="outline" disabled={busy} onClick={regenerateCodes}>
                            New recovery codes
                        </Button>
                        <Button variant="destructive" disabled={busy} onClick={disable}>
                            Turn off
                        </Button>
                    </div>
                </div>
            )}

            {!enabled && !hasPendingSetup && (
                <Button disabled={busy} onClick={enable}>
                    Enable two-factor authentication
                </Button>
            )}

            {hasPendingSetup && (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        1. Scan this code with your authenticator app. 2. Type the 6-digit code it shows to finish.
                    </p>

                    <div
                        className="inline-block rounded-lg border bg-white p-3 [&_svg]:h-48 [&_svg]:w-48"
                        dangerouslySetInnerHTML={{ __html: qr ?? '' }}
                    />

                    {secret && (
                        <p className="text-sm text-muted-foreground">
                            Cannot scan? Enter this key: <span className="font-mono text-foreground">{secret}</span>
                        </p>
                    )}

                    {requiresConfirmation && (
                        <form
                            className="flex max-w-xs flex-col gap-2"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void confirm();
                            }}
                        >
                            <Label htmlFor="two_factor_code">6-digit code</Label>
                            <Input
                                id="two_factor_code"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={code}
                                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                                placeholder="123456"
                            />
                            <Button type="submit" disabled={busy || code.length !== 6}>
                                Confirm and turn on
                            </Button>
                        </form>
                    )}
                </div>
            )}

            <InputError message={error ?? undefined} />
        </div>
    );
}