import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft, BarChart3, Boxes, ChefHat, Coffee, ReceiptText } from 'lucide-react';
import type { ComponentType, PropsWithChildren } from 'react';

import { home } from '@/routes';

const highlights: { icon: ComponentType<{ className?: string }>; text: string }[] = [
    { icon: ReceiptText, text: 'Ring up orders with sizes and add-ons' },
    { icon: ChefHat, text: 'Send tickets to the bar, kitchen and pastry' },
    { icon: Boxes, text: 'Recipes deduct stock on every sale' },
    { icon: BarChart3, text: 'Close shifts and review daily sales' },
];

/**
 * Inputs, labels, links and the submit button inside the card are styled here, so every page that
 * uses this layout (login, forgot password, reset, confirm, two-factor) matches without edits.
 */
const formStyles = [
    '[&_input:not([type=checkbox]):not([type=radio])]:h-11',
    '[&_input:not([type=checkbox]):not([type=radio])]:rounded-lg',
    '[&_input:not([type=checkbox]):not([type=radio])]:border-slate-300',
    '[&_input:not([type=checkbox]):not([type=radio])]:bg-white',
    '[&_input:not([type=checkbox]):not([type=radio])]:text-base',
    '[&_input:not([type=checkbox]):not([type=radio]):focus-visible]:border-[oklch(0.34_0.035_255)]',
    '[&_input:not([type=checkbox]):not([type=radio]):focus-visible]:ring-[oklch(0.34_0.035_255/0.2)]',
    '[&_label]:text-slate-700',
    '[&_a]:text-[oklch(0.34_0.035_255)]',
    '[&_button[type=submit]]:h-12',
    '[&_button[type=submit]]:rounded-full',
    '[&_button[type=submit]]:bg-[oklch(0.34_0.035_255)]',
    '[&_button[type=submit]]:text-base',
    '[&_button[type=submit]]:font-semibold',
    '[&_button[type=submit]]:text-white',
    '[&_button[type=submit]]:shadow-lg',
    '[&_button[type=submit]]:shadow-slate-900/20',
    '[&_button[type=submit]:hover]:bg-[oklch(0.28_0.035_255)]',
    '[&_button[type=submit]:active]:scale-[0.98]',
].join(' ');

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    const { name } = usePage().props as { name?: string };
    const appName = name || 'POS & Inventory';

    return (
        <main className="relative flex min-h-svh items-center overflow-hidden bg-slate-50 px-6 py-12 text-slate-900">
            {/* Atmosphere: soft glows + fading grid */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-slate-300/50 blur-3xl" />
                <div className="absolute -right-24 bottom-[-12rem] size-[32rem] rounded-full bg-blue-200/40 blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(51,65,85,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(51,65,85,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
            </div>

            <section className="relative mx-auto grid w-full max-w-5xl items-center gap-16 lg:grid-cols-[1fr_26rem]">
                {/* Left: brand (desktop only) */}
                <div className="hidden transition-all duration-700 lg:block starting:translate-y-4 starting:opacity-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm backdrop-blur">
                        <Coffee className="size-4 text-[oklch(0.34_0.035_255)]" />
                        {appName}
                    </div>

                    <h2 className="mt-6 font-serif text-5xl leading-[1.08] font-semibold tracking-tight text-[oklch(0.34_0.035_255)] xl:text-6xl">
                        Welcome back to
                        <br />
                        <span className="bg-gradient-to-r from-[oklch(0.34_0.035_255)] via-[oklch(0.48_0.08_255)] to-[oklch(0.6_0.11_250)] bg-clip-text text-transparent">
                            the counter.
                        </span>
                    </h2>

                    <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-600">
                        Sign in to start your shift, take orders and keep the stockroom in sync.
                    </p>

                    <ul className="mt-10 space-y-4">
                        {highlights.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-center gap-3 text-sm text-slate-700">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.34_0.035_255/0.08)] text-[oklch(0.34_0.035_255)]">
                                    <Icon className="size-[18px]" />
                                </span>
                                {text}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Right: form card */}
                <div className="mx-auto w-full max-w-md transition-all delay-200 duration-1000 starting:translate-y-6 starting:opacity-0">
                    {/* Mobile brand */}
                    <Link href={home()} className="mb-6 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 lg:hidden">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-[oklch(0.34_0.035_255)] text-white">
                            <Coffee className="size-5" />
                        </span>
                        {appName}
                    </Link>

                    <div className="rounded-3xl border border-slate-900/10 bg-white p-8 shadow-2xl shadow-slate-900/10 sm:p-10">
                        {(title || description) && (
                            <div className="mb-6">
                                {title && <h1 className="font-serif text-3xl font-semibold text-[oklch(0.34_0.035_255)]">{title}</h1>}
                                {description && <p className="mt-1.5 text-sm text-slate-500">{description}</p>}
                            </div>
                        )}

                        <div className={formStyles}>{children}</div>
                    </div>

                    <Link href={home()} className="mt-6 flex items-center justify-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900">
                        <ArrowLeft className="size-4" />
                        Back to home
                    </Link>
                </div>
            </section>
        </main>
    );
}