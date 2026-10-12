import { Head, Link, useForm } from '@inertiajs/react';
import { Delete } from 'lucide-react';
import { useEffect, useState } from 'react';

import PinLoginController from '@/actions/App/Http/Controllers/PinLoginController';
import { Button } from '@/components/ui/button';
import { login } from '@/routes';

type Staff = {
    id: number;
    name: string;
    role: string | null;
};

type Props = {
    staff: Staff[];
};

const MAX_PIN = 6;
const MIN_PIN = 4;

export default function PinLogin({ staff }: Props) {
    const [selected, setSelected] = useState<Staff | null>(null);
    const form = useForm({ user_id: 0, pin: '' });

    const press = (digit: string) => {
        if (form.data.pin.length < MAX_PIN) {
            form.setData('pin', form.data.pin + digit);
            form.clearErrors();
        }
    };

    const backspace = () => form.setData('pin', form.data.pin.slice(0, -1));

    const choose = (person: Staff | null) => {
        setSelected(person);
        form.setData({ user_id: person?.id ?? 0, pin: '' });
        form.clearErrors();
    };

    const submit = () => {
        if (!selected || form.data.pin.length < MIN_PIN || form.processing) {
            return;
        }

        form.post(PinLoginController.store.url(), {
            onError: () => form.setData('pin', ''),
        });
    };

    // Keyboard support for desktop terminals.
    useEffect(() => {
        if (!selected) {
            return;
        }

        const onKey = (event: KeyboardEvent) => {
            if (/^\d$/.test(event.key)) {
                press(event.key);
            } else if (event.key === 'Backspace') {
                backspace();
            } else if (event.key === 'Enter') {
                submit();
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    });

    return (
        <div className="bg-background flex min-h-svh items-center justify-center p-6">
            <Head title="Staff sign in" />

            <div className="w-full max-w-sm space-y-6">
                {!selected ? (
                    <>
                        <div className="text-center">
                            <h1 className="text-2xl font-semibold">Who is signing in?</h1>
                            <p className="text-muted-foreground text-sm">Pick your name to continue.</p>
                        </div>

                        {staff.length === 0 ? (
                            <p className="text-muted-foreground text-center text-sm">No staff with a PIN yet.</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {staff.map((person) => (
                                    <Button key={person.id} variant="outline" className="h-20 flex-col gap-1" onClick={() => choose(person)}>
                                        <span className="font-medium">{person.name}</span>
                                        {person.role && <span className="text-muted-foreground text-xs capitalize">{person.role}</span>}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="text-center">
                            <h1 className="text-2xl font-semibold">Hi, {selected.name}</h1>
                            <p className="text-muted-foreground text-sm">Enter your PIN.</p>
                        </div>

                        <div className="flex justify-center gap-3" aria-label={`${form.data.pin.length} digits entered`}>
                            {Array.from({ length: MAX_PIN }).map((_, index) => (
                                <span
                                    key={index}
                                    className={`size-3.5 rounded-full border ${index < form.data.pin.length ? 'bg-foreground' : 'bg-transparent'}`}
                                />
                            ))}
                        </div>

                        {form.errors.pin && (
                            <p role="alert" className="text-destructive text-center text-sm">
                                {form.errors.pin}
                            </p>
                        )}

                        <div className="grid grid-cols-3 gap-3">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                                <Button key={digit} type="button" variant="outline" className="h-16 text-xl" onClick={() => press(digit)}>
                                    {digit}
                                </Button>
                            ))}
                            <Button type="button" variant="ghost" className="h-16" onClick={() => choose(null)}>
                                Back
                            </Button>
                            <Button type="button" variant="outline" className="h-16 text-xl" onClick={() => press('0')}>
                                0
                            </Button>
                            <Button type="button" variant="ghost" className="h-16" onClick={backspace} aria-label="Delete last digit">
                                <Delete className="size-5" />
                            </Button>
                        </div>

                        <Button className="h-12 w-full" disabled={form.data.pin.length < MIN_PIN || form.processing} onClick={submit}>
                            Sign in
                        </Button>
                    </>
                )}

                <p className="text-center text-sm">
                    <Link href={login()} className="text-muted-foreground underline underline-offset-4">
                        Use email and password instead
                    </Link>
                </p>
            </div>
        </div>
    );
}