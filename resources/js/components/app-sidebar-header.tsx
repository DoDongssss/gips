import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { ShoppingCart, Tablet, Timer } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { LowStockBell } from '@/components/inventory/low-stock-bell';
import { KioskAlertBell } from '@/components/kiosk/kiosk-alert-bell';
import { PrinterAlertBell } from '@/components/printer/printer-alert-bell';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useCan } from '@/hooks/use-can';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { index as posIndex } from '@/routes/pos';
import { index as shiftsIndex } from '@/routes/shifts';
import { app as kioskApp } from '@/routes/kiosk';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

type QuickLink = {
    title: string;
    href: ReturnType<typeof posIndex>;
    icon: LucideIcon;
    permission: string;
    /** Colors for the button; the Register is the main one, so it is filled. */
    className: string;
};

const quickLinks: QuickLink[] = [
    {
        title: 'Register',
        href: posIndex(),
        icon: ShoppingCart,
        permission: 'order.create',
        className: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
    },
    {
        title: 'Kiosk',
        href: kioskApp(),
        icon: Tablet,
        permission: 'device.manage',
        className:
            'border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200 dark:hover:bg-violet-900',
    },
    {
        title: 'Shift',
        href: shiftsIndex(),
        icon: Timer,
        permission: 'shift.open',
        className:
            'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900',
    },
];

function QuickLinks() {
    const { can } = useCan();
    const { isCurrentUrl } = useCurrentUrl();

    const visible = quickLinks.filter((link) => can(link.permission));

    if (visible.length === 0) {
        return null;
    }

    return (
        <nav aria-label="Quick links" className="flex items-center gap-2">
            {visible.map((link) => {
                const active = isCurrentUrl(link.href);

                return (
                    <Button
                        key={link.title}
                        asChild
                        variant="ghost"
                        className={`h-10 gap-2 rounded-lg px-3 font-medium md:px-4 ${link.className} ${
                            active ? 'ring-2 ring-ring/50 ring-offset-1 ring-offset-background' : ''
                        }`}
                    >
                        <Link href={link.href} aria-label={link.title} title={link.title} aria-current={active ? 'page' : undefined}>
                            <link.icon className="size-4" />
                            <span className="hidden md:inline">{link.title}</span>
                        </Link>
                    </Button>
                );
            })}
        </nav>
    );
}

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <div className="ml-auto flex items-center gap-3">
                <QuickLinks />
                <div className="bg-border h-6 w-px" />
                <KioskAlertBell />
                <PrinterAlertBell />
                <LowStockBell />
            </div>
        </header>
    );
}