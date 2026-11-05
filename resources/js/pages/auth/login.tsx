import { Form, Head } from '@inertiajs/react';

import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Sign in" />

            <div className="mb-5">
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Sign in</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">Staff email and password. Bar and kitchen tablets pair with a code, not this page.</p>
            </div>

            {status && (
                <div className="mb-4 rounded-md border border-success/25 bg-success/10 px-3 py-2 text-sm font-medium text-success" role="status">
                    {status}
                </div>
            )}

            <Form {...store.form()} resetOnSuccess={['password']} className="flex flex-col gap-4">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="email"
                                placeholder="you@cafe.com"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="password" className="shrink-0">
                                    Password
                                </Label>
                                {canResetPassword && (
                                    <TextLink href={request()} className="ml-auto text-sm" tabIndex={5}>
                                        Forgot password?
                                    </TextLink>
                                )}
                            </div>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                placeholder="Your password"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="flex items-center gap-3">
                            <Checkbox id="remember" name="remember" tabIndex={3} />
                            <Label htmlFor="remember" className="font-normal">
                                Keep me signed in on this device
                            </Label>
                        </div>

                        <Button type="submit" className="mt-1 h-11 w-full" tabIndex={4} disabled={processing} data-test="login-button">
                            {processing && <Spinner />}
                            Sign in
                        </Button>

                        <p className="text-center text-xs leading-relaxed text-muted-foreground">Guests order on the kiosk. This page is for owners and staff.</p>
                    </>
                )}
            </Form>
        </>
    );
}
