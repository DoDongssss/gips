import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Shown after the password when the account has two-factor authentication turned on. */
export default function TwoFactorChallenge() {
    const [useRecovery, setUseRecovery] = useState(false);

    return (
        <>
            <Head title="Two-factor authentication" />

            <Form action="/two-factor-challenge" method="post" key={useRecovery ? 'recovery' : 'code'} className="space-y-6">
                {({ errors, processing }) => (
                    <>
                        <div className="grid gap-2">
                            {useRecovery ? (
                                <>
                                    <Label htmlFor="recovery_code">Recovery code</Label>
                                    <Input id="recovery_code" name="recovery_code" autoFocus autoComplete="one-time-code" placeholder="Enter a recovery code" />
                                    <InputError message={errors.recovery_code} />
                                </>
                            ) : (
                                <>
                                    <Label htmlFor="code">Authentication code</Label>
                                    <Input id="code" name="code" inputMode="numeric" maxLength={6} autoFocus autoComplete="one-time-code" placeholder="123456" />
                                    <InputError message={errors.code} />
                                </>
                            )}
                        </div>

                        <Button className="w-full" disabled={processing}>
                            Continue
                        </Button>

                        <button type="button" className="text-sm text-muted-foreground underline" onClick={() => setUseRecovery((v) => !v)}>
                            {useRecovery ? 'Use an authentication code instead' : 'Use a recovery code instead'}
                        </button>
                    </>
                )}
            </Form>
        </>
    );
}

TwoFactorChallenge.layout = {
    title: 'Two-factor authentication',
    description: 'Enter the 6-digit code from your authenticator app to continue.',
};
