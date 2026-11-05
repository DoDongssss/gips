import { Form, Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';

type Props = {
    passwordRules: string;
};

export default function Register({ passwordRules }: Props) {
    const form = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post('/register', {
            onSuccess: () => {
                form.reset('password', 'password_confirmation');
            },
        });
    }

    return (
        <>
            <Head title="Register" />
            <Form onSubmit={submit} disableWhileProcessing className="flex flex-col gap-6">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="name"
                                    name="name"
                                    placeholder="Full name"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                />
                                <InputError message={errors.name ?? form.errors.name} className="mt-2" />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    name="email"
                                    placeholder="email@example.com"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                />
                                <InputError message={errors.email ?? form.errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <PasswordInput
                                    id="password"
                                    required
                                    tabIndex={3}
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder="Password"
                                    passwordrules={passwordRules}
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                />
                                <InputError message={errors.password ?? form.errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">Confirm password</Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    required
                                    tabIndex={4}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder="Confirm password"
                                    passwordrules={passwordRules}
                                    value={form.data.password_confirmation}
                                    onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                />
                                <InputError message={errors.password_confirmation ?? form.errors.password_confirmation} />
                            </div>

                            <Button type="submit" className="mt-2 w-full" tabIndex={5} data-test="register-user-button" disabled={form.processing}>
                                {(processing || form.processing) && <Spinner />}
                                Create account
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <TextLink href={login()} tabIndex={6}>
                                Log in
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Create an account',
    description: 'Enter your details below to create your account',
};
