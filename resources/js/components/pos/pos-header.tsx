import { Link, router, usePage } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import {
    Banknote,
    BellRing,
    CalendarDays,
    ChevronDown,
    ClipboardList,
    Clock,
    LayoutGrid,
    LogOut,
    Receipt,
    RotateCcw,
    Settings,
    ShoppingCart,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRealtimeRefetch } from '@/hooks/use-realtime';
import { readyOrdersQuery } from '@/lib/kds';
import { formatPeso } from '@/lib/money';
import { myOrdersQuery } from '@/lib/pos-session';
import { dashboard } from '@/routes';
import { usePosUi } from '@/stores/pos-ui-store';

const appName = import.meta.env.VITE_APP_NAME || 'GIPS';

function useNow(intervalMs = 15_000): Date {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), intervalMs);

        return () => window.clearInterval(timer);
    }, [intervalMs]);

    return now;
}

const timeText = (date: Date) => date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
const dateText = (date: Date) => date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

const initials = (name: string) =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

function Chip({
    icon: Icon,
    children,
    tone = 'blue',
}: {
    icon: typeof Clock;
    children: React.ReactNode;
    tone?: 'blue' | 'green';
}) {
    const colors = tone === 'green' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700';

    return (
        <div className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium tabular-nums ${colors}`}>
            <Icon className="size-4" />
            {children}
        </div>
    );
}

export function PosHeader() {
    const now = useNow();
    const { auth } = usePage<{ auth: { user: { name: string; email: string } } }>().props;
    const since = usePosUi((state) => state.since);
    const openDrawer = usePosUi((state) => state.openDrawer);
    const newSession = usePosUi((state) => state.newSession);

    const { data } = useQuery(myOrdersQuery(since));
    useRealtimeRefetch('pos.orders', 'order.updated', readyOrdersQuery().queryKey);
    const readyCount = (useQuery(readyOrdersQuery()).data ?? []).length;
    const summary = data?.summary;
    const unpaidCount = summary?.unpaid_count ?? 0;
    const salesCount = summary?.sales_count ?? 0;

    return (
        <header className="relative z-10 flex w-full shrink-0 items-center justify-between gap-3 border-b border-blue-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex min-w-0 items-center gap-4">
                <Link href={dashboard()} className="flex items-center gap-3" title="Back to dashboard">
                    <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                        <ShoppingCart className="size-6" />
                    </span>
                    <span className="leading-tight">
                        <span className="block text-lg font-semibold text-gray-900">POS System</span>
                        <span className="block text-sm text-gray-500">{appName}</span>
                    </span>
                </Link>

                <div className="hidden h-6 w-px bg-gray-200 md:block" />

                <div className="hidden items-center gap-2 md:flex">
                    <Chip icon={Clock}>{timeText(now)}</Chip>
                    <Chip icon={CalendarDays}>{dateText(now)}</Chip>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div
                    className="hidden items-center gap-2 lg:flex"
                    title={`Your sales since ${timeText(new Date(since))}`}
                >
                    <Chip icon={Banknote} tone="green">
                        {formatPeso(summary?.sales_cents ?? 0)}
                    </Chip>
                    <Chip icon={Receipt}>
                        {salesCount} {salesCount === 1 ? 'sale' : 'sales'}
                    </Chip>
                </div>

                <div className="hidden h-6 w-px bg-gray-200 lg:block" />

                <Button
                    variant="outline"
                    className="h-11 gap-2 border-blue-200 px-4 text-base text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => openDrawer('unpaid')}
                >
                    <ClipboardList className="size-5" />
                    Orders
                    {unpaidCount > 0 && (
                        <span className="rounded-md bg-blue-600 px-1.5 text-sm leading-6 font-medium text-white tabular-nums">
                            {unpaidCount}
                        </span>
                    )}
                </Button>

                {readyCount > 0 && (
                    <Button
                        variant="outline"
                        className="h-11 gap-2 border-green-300 bg-green-50 px-4 text-base text-green-700 hover:bg-green-100 hover:text-green-800"
                        onClick={() => openDrawer('ready')}
                    >
                        <BellRing className="size-5" />
                        Ready
                        <span className="rounded-md bg-green-600 px-1.5 text-sm leading-6 font-medium text-white tabular-nums">
                            {readyCount}
                        </span>
                    </Button>
                )}

                <div className="hidden h-6 w-px bg-gray-200 sm:block" />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-base font-medium text-gray-700 hover:bg-gray-100"
                        >
                            <Avatar className="size-9">
                                <AvatarFallback className="bg-blue-100 font-medium text-blue-700">
                                    {initials(auth.user.name)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="hidden max-w-32 truncate xl:inline">{auth.user.name}</span>
                            <ChevronDown className="size-5 text-gray-500" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60">
                        <DropdownMenuLabel className="space-y-0.5">
                            <p className="truncate text-base font-medium">{auth.user.name}</p>
                            <p className="truncate text-sm font-normal text-gray-500">{auth.user.email}</p>
                            <p className="text-sm font-normal text-gray-500">
                                Session started {timeText(new Date(since))}
                            </p>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href={dashboard()}>
                                <LayoutGrid className="size-5" /> Back to dashboard
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/settings/profile">
                                <Settings className="size-5" /> Settings
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => newSession()}>
                            <RotateCcw className="size-5" /> Start a new session
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => {
                                router.flushAll();
                                router.post('/logout');
                            }}
                        >
                            <LogOut className="size-5" /> Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
