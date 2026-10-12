import { Link } from '@inertiajs/react';
import { BookOpen, FolderGit2, LayoutGrid, LayoutList, Receipt, Settings, SquareUserRound, User } from 'lucide-react';
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
import { index as TaxesIndex } from '@/routes/taxes'



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
        children: [
            { title: 'Configuration', href: ConfigurationIndex() },
            { title: 'Tax', href: TaxesIndex(), permission: 'setting.view' },
            { title: 'Audit Logs', href: AuditLogsIndex() },
            { title: 'Idempotency Keys', href: '/settings/company-images' },
            { title: 'Notifications', href: '/settings/payment-types' },
            { title: 'Permissions', href: '/settings/trip-schedules' },
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
