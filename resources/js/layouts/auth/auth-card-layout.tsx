import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Coffee, DoorOpen, KeyRound, ReceiptText } from 'lucide-react';
import type { ComponentType, PropsWithChildren } from 'react';

import DemoAccountsCard, { type DemoAccount } from '@/layouts/auth/demo-accounts-card';
import { home } from '@/routes';
import type { SharedPageProps } from '@/types/inertia';

type AuthPageProps = SharedPageProps & {
    demoAccounts?: DemoAccount[] | null;
};

const BRAND = 'oklch(0.34 0.035 255)';

// What a member of staff does after signing in.
const steps: { icon: ComponentType<{ className?: string }>; title: string; text: string }[] = [
    { icon: KeyRound, title: 'Sign in', text: 'Use your staff email and password.' },
    { icon: DoorOpen, title: 'Open your shift', text: 'Start the shift before you take orders.' },
    { icon: ReceiptText, title: 'Take orders', text: 'The kitchen and the stock follow every sale.' },
];

const roles = ['Owner', 'Manager', 'Cashier', 'Barista', 'Kitchen'];

/**
 * Shell for the sign-in pages: a short checklist on the left (large screens), the form card on the right.
 * It draws its own full-screen background, so the page that wraps it should not add another one.
 */
export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    const { demoAccounts, name } = usePage<AuthPageProps>().props;
    const demos = demoAccounts?.length ? demoAccounts : null;
    const appName = name || 'POS & Inventory';

    return (
        <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-slate-50 px-5 py-8 text-slate-900">
            {/* Atmosphere: soft glows + fading grid */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -top-40 -left-32 size-[32rem] rounded-full bg-slate-300/50 blur-3xl" />
                <div className="absolute -right-24 bottom-[-12rem] size-[30rem] rounded-full bg-blue-200/40 blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(51,65,85,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(51,65,85,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
            </div>

            <div className="relative grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1fr_26rem]">
                {/* Left: what happens next (large screens) */}
                <aside className="hidden transition-all duration-700 lg:block starting:translate-y-4 starting:opacity-0">
                    <div className="inline-flex items-center gap-2 rounded-md border border-slate-900/10 bg-white/70 px-3 py-1 text-xs font-semibold tracking-wide text-slate-600 uppercase shadow-sm backdrop-blur">
                        <Coffee className="size-3.5" style={{ color: BRAND }} />
                        {appName}
                    </div>

                    <h2 className="mt-4 font-serif text-4xl leading-[1.08] font-semibold tracking-tight xl:text-5xl" style={{ color: BRAND }}>
                        Welcome back to
                        <br />
                        <span className="bg-gradient-to-r from-[oklch(0.34_0.035_255)] via-[oklch(0.48_0.08_255)] to-[oklch(0.6_0.11_250)] bg-clip-text text-transparent">the counter.</span>
                    </h2>

                    <p className="mt-3 max-w-md text-base leading-relaxed text-slate-600">Sign in to start your shift, take orders and keep the stockroom in sync.</p>

                    <ol className="mt-6 max-w-md divide-y divide-slate-900/10 overflow-hidden rounded-xl border border-slate-900/10 bg-white/80 shadow-sm backdrop-blur">
                        {steps.map(({ icon: Icon, title: stepTitle, text }, i) => (
                            <li key={stepTitle} className="flex items-center gap-3 px-4 py-3">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'oklch(0.34 0.035 255 / 0.08)', color: BRAND }}>
                                    <Icon className="size-[18px]" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm leading-tight font-semibold">
                                        <span className="mr-1.5 text-slate-400 tabular-nums">{i + 1}</span>
                                        {stepTitle}
                                    </span>
                                    <span className="block text-xs text-slate-500">{text}</span>
                                </span>
                            </li>
                        ))}
                    </ol>

                    <p className="mt-5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span className="font-semibold text-slate-600">Roles</span>
                        {roles.map((role) => (
                            <span key={role} className="rounded-md border border-slate-900/10 bg-white/70 px-2 py-0.5">
                                {role}
                            </span>
                        ))}
                    </p>
                </aside>

                {/* Right: the form */}
                <main className="mx-auto w-full max-w-md transition-all delay-200 duration-1000 starting:translate-y-6 starting:opacity-0">
                    {/* Brand row for small screens, where the left side is hidden */}
                    <div className="mb-4 flex items-center gap-2.5 lg:hidden">
                        <span className="flex size-9 items-center justify-center rounded-lg text-white shadow-sm" style={{ backgroundColor: BRAND }}>
                            <Coffee className="size-[18px]" />
                        </span>
                        <span className="text-base font-semibold tracking-tight">{appName}</span>
                    </div>

                    {(title || description) && (
                        <div className="mb-4">
                            {title && <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>}
                            {description && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</p>}
                        </div>
                    )}

                    {demos && <DemoAccountsCard accounts={demos} className="mb-3" />}

                    <div className="rounded-2xl border border-slate-900/10 bg-card p-5 shadow-2xl shadow-slate-900/10 sm:p-6">{children}</div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-sm text-slate-500">
                        <Link
                            href={home()}
                            className="inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                        >
                            <ArrowLeft className="size-4" aria-hidden />
                            Back to home
                        </Link>
                        <span className="text-xs">Need an account? Ask the store owner.</span>
                    </div>
                </main>
            </div>
        </div>
    );
}