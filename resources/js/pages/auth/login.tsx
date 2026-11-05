import { Form, Head } from '@inertiajs/react';
import { LockKeyhole, ShoppingBag, Tablet } from 'lucide-react';

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

            <div className="mb-4 flex items-start gap-3">
                <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-lg shadow-sm">
                    <LockKeyhole className="size-5" />
                </span>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
                    <p className="text-muted-foreground text-sm">Staff email and password.</p>
                </div>
            </div>

            {status && (
                <div className="border-success/25 bg-success/10 text-success mb-4 rounded-md border px-3 py-2 text-sm font-medium" role="status">
                    {status}
                </div>
            )}

            <Form {...store.form()} resetOnSuccess={['password']} className="flex flex-col gap-3.5">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" name="email" required autoFocus tabIndex={1} autoComplete="email" placeholder="test@kjips.com" className="h-11" />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="password">Password</Label>
                            <PasswordInput id="password" name="password" required tabIndex={2} autoComplete="current-password" placeholder="Your password" className="h-11" />
                            <InputError message={errors.password} />
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <Checkbox id="remember" name="remember" tabIndex={3} />
                                <Label htmlFor="remember" className="font-normal">
                                    Keep me signed in
                                </Label>
                            </div>

                            {canResetPassword && (
                                <TextLink href={request()} className="text-sm" tabIndex={5}>
                                    Forgot password?
                                </TextLink>
                            )}
                        </div>

                        <Button type="submit" className="h-11 w-full" tabIndex={4} disabled={processing} data-test="login-button">
                            {processing && <Spinner />}
                            Sign in
                        </Button>
                    </>
                )}
            </Form>

            {/* Who should not be using this page */}
            <div className="mt-4 grid gap-2 border-t border-dashed pt-4 sm:grid-cols-2">
                <div className="bg-muted/50 flex items-start gap-2.5 rounded-lg p-2.5">
                    <Tablet className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
                    <p className="text-muted-foreground text-xs leading-snug">
                        <span className="text-foreground block font-semibold">Bar &amp; kitchen tablets</span>
                        Pair with a code, not this page.
                    </p>
                </div>
                <div className="bg-muted/50 flex items-start gap-2.5 rounded-lg p-2.5">
                    <ShoppingBag className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
                    <p className="text-muted-foreground text-xs leading-snug">
                        <span className="text-foreground block font-semibold">Guests</span>
                        Order on the kiosk. This page is for staff.
                    </p>
                </div>
            </div>
        </>
    );
}