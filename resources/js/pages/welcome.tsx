import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Banknote, BarChart3, Boxes, ChefHat, Coffee, ReceiptText, ShieldCheck, Tablet, TriangleAlert, Truck } from 'lucide-react';
import type { ComponentType } from 'react';

import { formatPeso } from '@/lib/money';
import { dashboard, login } from '@/routes';
import type { SharedPageProps } from '@/types/inertia';

type Icon = ComponentType<{ className?: string }>;

const BRAND = 'oklch(0.34 0.035 255)';

// How an order moves through the system.
const flow: { icon: Icon; title: string; text: string }[] = [
    { icon: ReceiptText, title: 'Take the order', text: 'At the counter or on the kiosk' },
    { icon: ChefHat, title: 'Send to the station', text: 'Bar, kitchen or pastry' },
    { icon: Boxes, title: 'Stock updates', text: 'Recipes deduct ingredients' },
    { icon: BarChart3, title: 'Close the shift', text: 'X and Z reports' },
];

const features: { icon: Icon; title: string; text: string }[] = [
    { icon: ReceiptText, title: 'Point of sale', text: 'Sizes, add-ons, Senior and PWD discounts, and cash, e-wallet, card or bank payments.' },
    { icon: ChefHat, title: 'Kitchen display', text: 'Tickets go to the right station, with warning and late timers so nothing waits.' },
    { icon: Tablet, title: 'Self-order kiosk', text: 'Customers order on a tablet, get a pickup number and pay at the counter.' },
    { icon: Boxes, title: 'Inventory & recipes', text: 'Ingredients, recipes per size and add-on, stock counts and waste logs.' },
    { icon: Truck, title: 'Purchasing', text: 'Suppliers, purchase orders and goods receipts that add to the stock.' },
    { icon: BarChart3, title: 'Shifts & reports', text: 'Open and close shifts, track cash in and out, and print X and Z reports.' },
];

const payments = ['Cash', 'GCash', 'Maya', 'Card', 'Bank transfer'];
const roles = ['Owner', 'Manager', 'Cashier', 'Barista', 'Kitchen'];

// Sample order shown in the preview card (cents).
const sampleOrder = [
    { name: 'Iced Caramel Macchiato', note: 'Oat milk · Less ice', qty: 1, cents: 18500 },
    { name: 'Butter Croissant', note: 'Warm up', qty: 2, cents: 8500 },
    { name: 'Chicken Pesto Sandwich', note: '', qty: 1, cents: 17500 },
];

const sampleTotal = sampleOrder.reduce((sum, line) => sum + line.cents * line.qty, 0);

export default function Welcome() {
    const { auth, name: appNameFromProps } = usePage<SharedPageProps>().props;
    const appName = appNameFromProps || 'POS & Inventory';
    const signedIn = Boolean(auth.user);

    return (
        <>
            <Head title="Welcome" />

            <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
                {/* Atmosphere: soft glows + fading grid */}
                <div aria-hidden className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-40 -left-32 size-[32rem] rounded-full bg-slate-300/50 blur-3xl" />
                    <div className="absolute -right-24 bottom-[-12rem] size-[30rem] rounded-full bg-blue-200/40 blur-3xl" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(51,65,85,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(51,65,85,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
                </div>

                <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-4 sm:px-8">
                    {/* Header */}
                    <header className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                            <span className="flex size-9 items-center justify-center rounded-lg text-white shadow-sm" style={{ backgroundColor: BRAND }}>
                                <Coffee className="size-[18px]" />
                            </span>
                            <span className="text-base font-semibold tracking-tight">{appName}</span>
                        </div>

                        <div className="flex items-center gap-3">
                            {!signedIn && <span className="hidden text-sm text-slate-500 sm:inline">Staff access only</span>}
                            <Link
                                href={signedIn ? dashboard() : login()}
                                className="inline-flex h-9 items-center rounded-lg border border-slate-900/10 bg-white px-4 text-sm font-semibold shadow-sm transition-colors hover:bg-slate-100"
                            >
                                {signedIn ? 'Dashboard' : 'Log in'}
                            </Link>
                        </div>
                    </header>

                    <main className="flex flex-1 flex-col justify-center gap-7 py-7">
                        {/* Hero */}
                        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="transition-all duration-700 starting:translate-y-4 starting:opacity-0">
                                <div className="inline-flex items-center gap-2 rounded-md border border-slate-900/10 bg-white/70 px-3 py-1 text-xs font-semibold tracking-wide text-slate-600 uppercase shadow-sm backdrop-blur">
                                    <span className="relative flex size-2">
                                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                                    </span>
                                    Counter · Kitchen · Stockroom
                                </div>

                                <h1 className="mt-4 font-serif text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-6xl" style={{ color: BRAND }}>
                                    Every order. Every ingredient.
                                    <br />
                                    <span className="bg-gradient-to-r from-[oklch(0.34_0.035_255)] via-[oklch(0.48_0.08_255)] to-[oklch(0.6_0.11_250)] bg-clip-text text-transparent">
                                        In perfect sync.
                                    </span>
                                </h1>

                                <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                                    Ring up a sale and the recipe deducts the stock, the right station gets the ticket, and you always know what to reorder.
                                </p>

                                <div className="mt-6 flex flex-wrap items-center gap-3">
                                    <Link
                                        href={signedIn ? dashboard() : login()}
                                        className="group inline-flex h-11 items-center gap-2 rounded-lg px-6 text-base font-semibold text-white shadow-lg transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[oklch(0.6_0.11_250)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 focus-visible:outline-none active:scale-[0.98]"
                                        style={{ backgroundColor: BRAND, boxShadow: '0 10px 24px -10px oklch(0.34 0.035 255 / 0.6)' }}
                                    >
                                        {signedIn ? 'Go to dashboard' : 'Log in'}
                                        <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                                    </Link>

                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <Banknote className="size-4" />
                                        {payments.join(' · ')}
                                    </div>
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="relative mx-auto w-full max-w-md transition-all delay-200 duration-1000 starting:translate-y-6 starting:opacity-0">
                                <div className="relative rounded-2xl border border-slate-900/10 bg-white p-5 shadow-2xl shadow-slate-900/10">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-medium tracking-widest text-slate-400 uppercase">Order</p>
                                            <p className="font-serif text-xl leading-tight font-semibold">#1042</p>
                                        </div>
                                        <span className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: 'oklch(0.34 0.035 255 / 0.08)', color: BRAND }}>
                                            <span className="relative flex size-2">
                                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[oklch(0.5_0.08_255)] opacity-75" />
                                                <span className="relative inline-flex size-2 rounded-full" style={{ backgroundColor: BRAND }} />
                                            </span>
                                            Preparing
                                        </span>
                                    </div>

                                    <ul className="mt-3 divide-y divide-slate-900/10">
                                        {sampleOrder.map((line) => (
                                            <li key={line.name} className="flex items-start justify-between gap-4 py-2">
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        <span className="mr-2 text-slate-400 tabular-nums">{line.qty}×</span>
                                                        {line.name}
                                                    </p>
                                                    {line.note && <p className="mt-0.5 pl-6 text-xs text-slate-500">{line.note}</p>}
                                                </div>
                                                <span className="text-sm text-slate-700 tabular-nums">{formatPeso(line.cents * line.qty)}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="flex items-center justify-between border-t border-slate-900/10 pt-3">
                                        <span className="text-sm text-slate-500">Total</span>
                                        <span className="font-serif text-xl font-semibold tabular-nums" style={{ color: BRAND }}>
                                            {formatPeso(sampleTotal)}
                                        </span>
                                    </div>
                                </div>

                                {/* Kitchen chip */}
                                <div className="absolute -top-4 -right-3 hidden items-center gap-2 rounded-xl border border-slate-900/10 bg-white px-3 py-2 shadow-lg shadow-slate-900/10 sm:flex">
                                    <span className="flex size-7 items-center justify-center rounded-md text-white" style={{ backgroundColor: BRAND }}>
                                        <ChefHat className="size-3.5" />
                                    </span>
                                    <div>
                                        <p className="text-[11px] text-slate-500">Bar station</p>
                                        <p className="text-xs font-semibold">2 min to serve</p>
                                    </div>
                                </div>

                                {/* Stock alert */}
                                <div className="mt-3 w-60 rounded-xl border border-slate-900/10 bg-white p-3 shadow-lg shadow-slate-900/10 sm:absolute sm:-bottom-8 sm:-left-10 sm:mt-0">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: BRAND }}>
                                        <TriangleAlert className="size-3.5" />
                                        Low stock
                                    </div>
                                    <p className="mt-1.5 text-sm font-medium">Whole milk</p>
                                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full w-1/5 rounded-full bg-gradient-to-r from-[oklch(0.6_0.11_250)] to-[oklch(0.34_0.035_255)]" />
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">4.2 L left · reorder soon</p>
                                </div>

                                {/* Payment chip */}
                                <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-900/10 bg-white px-3 py-2 shadow-lg shadow-slate-900/10 sm:absolute sm:-right-3 sm:-bottom-6 sm:mt-0">
                                    <span className="flex size-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                                        <ShieldCheck className="size-3.5" />
                                    </span>
                                    <div>
                                        <p className="text-[11px] text-slate-500">Payment received</p>
                                        <p className="text-xs font-semibold">GCash · {formatPeso(sampleTotal)}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* How an order flows */}
                        <ol className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-900/10 bg-slate-900/10 shadow-sm sm:grid-cols-4">
                            {flow.map(({ icon: Icon, title, text }, i) => (
                                <li key={title} className="flex items-center gap-3 bg-white/90 px-4 py-3">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'oklch(0.34 0.035 255 / 0.08)', color: BRAND }}>
                                        <Icon className="size-[18px]" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-sm leading-tight font-semibold">
                                            <span className="mr-1.5 text-slate-400 tabular-nums">{i + 1}</span>
                                            {title}
                                        </span>
                                        <span className="block truncate text-xs text-slate-500">{text}</span>
                                    </span>
                                </li>
                            ))}
                        </ol>

                        {/* Features */}
                        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {features.map(({ icon: Icon, title, text }) => (
                                <li key={title} className="flex gap-3 rounded-xl border border-slate-900/10 bg-white/80 p-3.5 shadow-sm backdrop-blur transition-colors hover:bg-white">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'oklch(0.34 0.035 255 / 0.08)', color: BRAND }}>
                                        <Icon className="size-[18px]" />
                                    </span>
                                    <div className="min-w-0">
                                        <h2 className="text-sm font-semibold">{title}</h2>
                                        <p className="mt-0.5 text-xs leading-snug text-slate-500">{text}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </main>

                    {/* Footer */}
                    <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-slate-900/10 pt-3 text-xs text-slate-500">
                        <p className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-slate-600">Roles</span>
                            {roles.map((role) => (
                                <span key={role} className="rounded-md border border-slate-900/10 bg-white/70 px-2 py-0.5">
                                    {role}
                                </span>
                            ))}
                        </p>
                        <p>
                            &copy; {new Date().getFullYear()} {appName}
                        </p>
                    </footer>
                </div>
            </div>
        </>
    );
}