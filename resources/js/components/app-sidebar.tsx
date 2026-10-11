import { Link } from '@inertiajs/react';
import { BookOpen, FolderGit2, LayoutGrid, Settings, SquareUserRound, User } from 'lucide-react';
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
import type { NavItem } from '@/types';

import { useCan } from '@/hooks/use-can';

const mainNavItems: NavItem[] = [
    { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
    { title: 'User', href: userIndex(), icon: SquareUserRound, permission: 'user.view' },
    {
        title: 'Settings',
        href: '#', 
        icon: Settings,
        children: [
            { title: 'Lean Season', href: '/settings/lean-season' },
            { title: 'Reservation Schedule', href: '/settings/reservation-schedule' },
            { title: 'Company Images', href: '/settings/company-images' },
            { title: 'Payment Types', href: '/settings/payment-types' },
            { title: 'Trip Schedules', href: '/settings/trip-schedules' },
            { title: 'Configurations', href: '/settings/configurations' },
            { title: 'Station Legends', href: '/settings/station-legends' },
            { title: 'Passenger Types', href: '/settings/passenger-types' },
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
