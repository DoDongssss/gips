import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, BarChart3, Boxes, ChefHat, Coffee, ReceiptText, TriangleAlert } from 'lucide-react';
import type { ComponentType } from 'react';

import { formatPeso } from '@/lib/money';
import { dashboard, login } from '@/routes';

const modules: { icon: ComponentType<{ className?: string }>; label: string; text: string }[] = [
    { icon: ReceiptText, label: 'Point of sale', text: 'Sizes, add-ons, discounts' },
    { icon: ChefHat, label: 'Kitchen display', text: 'Bar, kitchen and pastry' },
    { icon: Boxes, label: 'Inventory', text: 'Recipes, suppliers, counts' },
    { icon: BarChart3, label: 'Reports', text: 'Shifts and daily sales' },
];

// Sample order shown in the preview card (cents).
const sampleOrder = [
    { name: 'Iced Caramel Macchiato', note: 'Oat milk · Less ice', qty: 1, cents: 18500 },
    { name: 'Butter Croissant', note: 'Warm up', qty: 2, cents: 8500 },
    { name: 'Chicken Pesto Sandwich', note: '', qty: 1, cents: 17500 },
];

const sampleTotal = sampleOrder.reduce((sum, line) => sum + line.cents * line.qty, 0);

export default function Welcome() {
    const { auth, ...props } = usePage().props;
    const appName = (props as { name?: string }).name || 'POS & Inventory';

    return (
        <>
            <Head title="Welcome" />

            <main className="relative flex min-h-screen items-center overflow-hidden bg-slate-50 px-6 py-16 text-slate-900">
                {/* Atmosphere: soft glows + fading grid */}
                <div aria-hidden className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-slate-300/50 blur-3xl" />
                    <div className="absolute -right-24 bottom-[-12rem] size-[32rem] rounded-full bg-blue-200/40 blur-3xl" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(51,65,85,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(51,65,85,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
                </div>

                <section className="relative mx-auto grid w-full max-w-6xl items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
                    {/* Left: message */}
                    <div className="transition-all duration-700 starting:translate-y-4 starting:opacity-0">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm backdrop-blur">
                            <Coffee className="size-4 text-[oklch(0.34_0.035_255)]" />
                            {appName}
                        </div>

                        <h1 className="mt-6 font-serif text-5xl leading-[1.05] font-semibold tracking-tight text-[oklch(0.34_0.035_255)] sm:text-6xl lg:text-7xl">
                            Every order.
                            <br />
                            Every ingredient.
                            <br />
                            <span className="bg-gradient-to-r from-[oklch(0.34_0.035_255)] via-[oklch(0.48_0.08_255)] to-[oklch(0.6_0.11_250)] bg-clip-text text-transparent">
                                In perfect sync.
                            </span>
                        </h1>

                        <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
                            One system for the counter, the kitchen and the stockroom. Ring up a sale and the recipe deducts the stock, the right station
                            gets the ticket, and you always know what to reorder.
                        </p>

                        <div className="mt-9 flex flex-wrap items-center gap-4">
                            <Link
                                href={auth.user ? dashboard() : login()}
                                className="group inline-flex h-[3.25rem] items-center gap-2 rounded-full bg-[oklch(0.34_0.035_255)] px-8 text-base font-semibold text-white shadow-lg shadow-[oklch(0.34_0.035_255/0.25)] transition-all hover:bg-[oklch(0.28_0.035_255)] focus-visible:ring-2 focus-visible:ring-[oklch(0.6_0.11_250)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 focus-visible:outline-none active:scale-[0.98]"
                            >
                                {auth.user ? 'Go to dashboard' : 'Log in'}
                                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                            </Link>
                            {!auth.user && <span className="text-sm text-slate-500">Staff access only</span>}
                        </div>

                        <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-slate-900/10 pt-6 sm:grid-cols-4">
                            {modules.map(({ icon: Icon, label, text }) => (
                                <li key={label}>
                                    <span className="flex size-9 items-center justify-center rounded-lg bg-[oklch(0.34_0.035_255/0.08)] text-[oklch(0.34_0.035_255)]">
                                        <Icon className="size-[18px]" />
                                    </span>
                                    <p className="mt-3 text-sm font-semibold text-slate-900">{label}</p>
                                    <p className="mt-0.5 text-xs leading-snug text-slate-500">{text}</p>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Right: product preview */}
                    <div className="relative mx-auto w-full max-w-md transition-all delay-200 duration-1000 starting:translate-y-6 starting:opacity-0">
                        {/* Order ticket */}
                        <div className="relative rounded-3xl border border-slate-900/10 bg-white p-6 shadow-2xl shadow-slate-900/10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium tracking-widest text-slate-400 uppercase">Order</p>
                                    <p className="font-serif text-2xl font-semibold text-slate-900">#1042</p>
                                </div>
                                <span className="inline-flex items-center gap-2 rounded-full bg-[oklch(0.34_0.035_255/0.08)] px-3 py-1 text-xs font-medium text-[oklch(0.34_0.035_255)]">
                                    <span className="relative flex size-2">
                                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[oklch(0.5_0.08_255)] opacity-75" />
                                        <span className="relative inline-flex size-2 rounded-full bg-[oklch(0.34_0.035_255)]" />
                                    </span>
                                    Preparing
                                </span>
                            </div>

                            <ul className="mt-6 divide-y divide-slate-900/10">
                                {sampleOrder.map((line) => (
                                    <li key={line.name} className="flex items-start justify-between gap-4 py-3">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">
                                                <span className="mr-2 text-slate-400 tabular-nums">{line.qty}×</span>
                                                {line.name}
                                            </p>
                                            {line.note && <p className="mt-0.5 pl-6 text-xs text-slate-500">{line.note}</p>}
                                        </div>
                                        <span className="text-sm text-slate-700 tabular-nums">{formatPeso(line.cents * line.qty)}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-2 flex items-center justify-between border-t border-slate-900/10 pt-4">
                                <span className="text-sm text-slate-500">Total</span>
                                <span className="font-serif text-2xl font-semibold text-[oklch(0.34_0.035_255)] tabular-nums">{formatPeso(sampleTotal)}</span>
                            </div>
                        </div>

                        {/* Stock alert */}
                        <div className="mt-4 w-64 rounded-2xl border border-slate-900/10 bg-white p-4 shadow-xl shadow-slate-900/10 sm:absolute sm:-bottom-10 sm:-left-12 sm:mt-0">
                            <div className="flex items-center gap-2 text-xs font-medium text-[oklch(0.34_0.035_255)]">
                                <TriangleAlert className="size-4" />
                                Low stock
                            </div>
                            <p className="mt-2 text-sm font-medium text-slate-900">Whole milk</p>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full w-1/5 rounded-full bg-gradient-to-r from-[oklch(0.6_0.11_250)] to-[oklch(0.34_0.035_255)]" />
                            </div>
                            <p className="mt-1.5 text-xs text-slate-500">4.2 L left · reorder soon</p>
                        </div>

                        {/* Kitchen chip */}
                        <div className="absolute -top-5 -right-3 hidden items-center gap-2 rounded-2xl border border-slate-900/10 bg-white px-4 py-3 shadow-xl shadow-slate-900/10 sm:flex">
                            <span className="flex size-8 items-center justify-center rounded-lg bg-[oklch(0.34_0.035_255)] text-white">
                                <ChefHat className="size-4" />
                            </span>
                            <div>
                                <p className="text-xs text-slate-500">Bar station</p>
                                <p className="text-sm font-medium text-slate-900">2 min to serve</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}