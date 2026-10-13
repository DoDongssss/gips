import { Link } from '@inertiajs/react';
import { Banknote, BarChart3, BookOpen, ChefHat, FolderGit2, LayoutGrid, LayoutList, MonitorSmartphone, Receipt, Settings, SquareUserRound, User } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as userIndex } from '@/routes/users'
import { index as ConfigurationIndex } from '@/routes/configurations'
import { index as AuditLogsIndex } from '@/routes/audit-logs'
import { index as CategoriesIndex } from '@/routes/menu/categories'
import { index as ProductsIndex } from '@/routes/menu/products'
import { index as GroupsIndex } from '@/routes/menu/groups'
import { index as OrdersIndex } from '@/routes/orders'
import { index as DiscountsIndex } from '@/routes/discounts'
import { index as PosIndex } from '@/routes/pos'
import { index as ShiftsIndex } from '@/routes/shifts'
import { index as TaxesIndex } from '@/routes/taxes'
import { index as StationsIndex } from '@/routes/stations'
import { index as KitchenIndex } from '@/routes/kitchen'
import { index as DevicesIndex } from '@/routes/devices'
import { index as ReportsIndex } from '@/routes/reports'
import { index as ZReportsIndex } from '@/routes/z-reports'




import type { NavItem } from '@/types';

import { useCan } from '@/hooks/use-can';

const mainNavItems: NavItem[] = [
    { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
    { title: 'User', href: userIndex(), icon: User, permission: 'user.view' },
    {
        title: 'Sales',
        href: '#',
        icon: Receipt,
        permission: 'order.view',
        children: [
            { title: 'Orders', href: OrdersIndex(), permission: 'order.view' },
            { title: 'Discounts', href: DiscountsIndex(), permission: 'discount.manage' },
        ],
    },
    { title: 'Register', href: PosIndex(), icon: MonitorSmartphone, permission: 'order.create' },
    { title: 'Shift', href: ShiftsIndex(), icon: Banknote, permission: 'shift.open' },
    { title: 'Kitchen', href: KitchenIndex(), icon: ChefHat, permission: 'kds.view' },
    {
        title: 'Menu',
        href: '#',
        icon: LayoutList,
        permission: 'menu.view',
        children: [
            { title: 'Products', href: ProductsIndex(), permission: 'menu.view' },
            { title: 'Category', href: CategoriesIndex(), permission: 'menu.view' },
            { title: 'Modifier', href: GroupsIndex(), permission: 'menu.view' },
        ],
    },
    {
        title: 'Settings',
        href: '#',
        icon: Settings,
        permission: 'setting.view',
        children: [
            { title: 'Configuration', href: ConfigurationIndex() },
            { title: 'Tax', href: TaxesIndex(), permission: 'setting.view' },
            { title: 'Stations', href: StationsIndex(), permission: 'setting.view' },
            { title: 'Devices', href: DevicesIndex(), permission: 'setting.view' },
            { title: 'Audit Logs', href: AuditLogsIndex(), permission: 'setting.view'},
        ],
    },
    {
        title: 'Reports',
        href: '#',
        icon: BarChart3,
        permission: 'report.view',
        children: [
            { title: 'Sales Reports', href: ReportsIndex(), permission: 'report.view' },
            { title: 'Z Reports', href: ZReportsIndex(), permission: 'report.view' },
        ],
    },
];

const footerNavItems: NavItem[] = [
    // {
    //     title: 'Repository',
    //     href: 'https://github.com/laravel/react-starter-kit',
    //     icon: FolderGit2,
    // },
    // {
    //     title: 'Documentation',
    //     href: 'https://laravel.com/docs/starter-kits#react',
    //     icon: BookOpen,
    // },
];

export function AppSidebar() {
    
    const { can } = useCan();
    const visibleItems = mainNavItems
    .filter((item) => !item.permission || can(item.permission))
    .map((item) => ({
        ...item,
        children: item.children?.filter((c) => !c.permission || can(c.permission)),
    }));

    return (
        <Sidebar collapsible="icon" variant="floating">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem className='border-b border-gray-300'>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={visibleItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
