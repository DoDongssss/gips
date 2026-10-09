import { router } from '@inertiajs/react';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import UserController from '@/actions/App/Http/Controllers/UserController';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';

type CredentialType = 'password' | 'pin';

type Generated = {
    user_id: number;
    type: CredentialType;
    value: string;
};

type FlashProps = {
    flash?: { generated_credential?: Generated | null };
};

export default function CredentialReset({ userId, userName }: { userId: number; userName: string }) {
    const [busy, setBusy] = useState<CredentialType | null>(null);
    const [generated, setGenerated] = useState<Generated | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    function generate(type: CredentialType) {
        setBusy(type);
        setGenerated(null);
        setError(null);
        setCopied(false);

        router.post(
            UserController.resetCredentials.url(userId),
            { type },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['users', 'flash'],
                onSuccess: (page) => {
                    const credential = (page.props as FlashProps).flash?.generated_credential ?? null;

                    if (credential) {
                        setGenerated(credential);
                    } else {
                        setError(`Could not generate a new ${type}. Please try again.`);
                    }
                },
                onError: () => setError(`Could not generate a new ${type}. Please try again.`),
                onFinish: () => setBusy(null),
            },
        );
    }

    async function copy() {
        if (!generated) {
            return;
        }

        try {
            await navigator.clipboard.writeText(generated.value);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    }

    return (
        <Can permission="user.reset-credentials">
            <div className="space-y-3 rounded-md border p-3">
                <div>
                    <p className="text-sm font-medium">Credentials</p>
                    <p className="text-muted-foreground text-xs">
                        Current passwords and PINs are stored securely and cannot be viewed. Generate a new one to give
                        to the staff member.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy !== null}
                        onClick={() => generate('password')}
                    >
                        {busy === 'password' ? 'Generating...' : 'Generate new password'}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy !== null}
                        onClick={() => generate('pin')}
                    >
                        {busy === 'pin' ? 'Generating...' : 'Generate new PIN'}
                    </Button>
                </div>

                {error && <p className="text-destructive text-sm">{error}</p>}

                {generated && (
                    <div className="bg-muted space-y-2 rounded-md p-3">
                        <p className="text-muted-foreground text-xs">
                            New {generated.type} for {userName}. This is shown once and cannot be viewed again.
                        </p>
                        <div className="flex items-center justify-between gap-2">
                            <code className="text-base font-semibold tracking-wider break-all">{generated.value}</code>
                            <Button type="button" variant="outline" size="sm" onClick={copy}>
                                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                                {copied ? 'Copied' : 'Copy'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Can>
    );
}