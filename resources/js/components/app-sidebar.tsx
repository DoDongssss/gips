import { Link } from '@inertiajs/react';
import { BarChart3, Boxes, LayoutGrid, LayoutList, Receipt, Settings, Tablet, User } from 'lucide-react';
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
import { useCan } from '@/hooks/use-can';
import { dashboard } from '@/routes';
import { index as AuditLogsIndex } from '@/routes/audit-logs';
import { index as ConfigurationIndex } from '@/routes/configurations';
import { index as DevicesIndex } from '@/routes/devices';
import { index as DiscountsIndex } from '@/routes/discounts';
import { index as CountsIndex } from '@/routes/inventory/counts';
import { index as IngredientsIndex } from '@/routes/inventory/ingredients';
import { index as MovementsIndex } from '@/routes/inventory/movements';
import { index as PurchaseOrdersIndex } from '@/routes/inventory/purchase-orders';
import { index as ReceiptsIndex } from '@/routes/inventory/receipts';
import { index as InventoryReportsIndex } from '@/routes/inventory/reports';
import { index as SuppliersIndex } from '@/routes/inventory/suppliers';
import { index as UnitsIndex } from '@/routes/inventory/units';
import { index as WasteIndex } from '@/routes/inventory/waste';
import { index as CategoriesIndex } from '@/routes/menu/categories';
import { index as GroupsIndex } from '@/routes/menu/groups';
import { index as ProductsIndex } from '@/routes/menu/products';
import { index as OrdersIndex } from '@/routes/orders';
import { index as ReportsIndex } from '@/routes/reports';
import { index as StationsIndex } from '@/routes/stations';
import { index as TaxesIndex } from '@/routes/taxes';
import { index as userIndex } from '@/routes/users';
import { index as KioskDevicesIndex } from '@/routes/kiosk/devices'
import { index as KioskScreensIndex } from '@/routes/kiosk/screens'
import { index as KioskUpsellIndex } from '@/routes/kiosk/upsell'
import { index as ZReportsIndex } from '@/routes/z-reports';
import type { NavItem } from '@/types';

type Section = { label?: string; items: NavItem[] };

// Register, Kitchen and Shift live in the top bar (app-sidebar-header.tsx).
const sections: Section[] = [
    {
        items: [{ title: 'Dashboard', href: dashboard(), icon: LayoutGrid }],
    },
    {
        label: 'Operations',
        items: [
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
                // No permission on the group: it shows when at least one child is allowed.
                title: 'Inventory',
                href: '#',
                icon: Boxes,
                children: [
                    { title: 'Ingredients', href: IngredientsIndex(), permission: 'inventory.view' },
                    { title: 'Movements', href: MovementsIndex(), permission: 'inventory.view' },
                    { title: 'Stock counts', href: CountsIndex(), permission: 'inventory.view' },
                    { title: 'Waste', href: WasteIndex(), permission: 'inventory.view' },
                    { title: 'Receiving', href: ReceiptsIndex(), permission: 'inventory.receive' },
                    { title: 'Purchase orders', href: PurchaseOrdersIndex(), permission: 'purchase.manage' },
                    { title: 'Suppliers', href: SuppliersIndex(), permission: 'supplier.manage' },
                    { title: 'Units', href: UnitsIndex(), permission: 'inventory.view' },
                ],
            },
        ],
    },
    {
        label: 'Insights',
        items: [
            {
                title: 'Reports',
                href: '#',
                icon: BarChart3,
                permission: 'report.view',
                children: [
                    { title: 'Sales Reports', href: ReportsIndex(), permission: 'report.view' },
                    { title: 'Z Reports', href: ZReportsIndex(), permission: 'report.view' },
                    { title: 'Inventory Costs', href: InventoryReportsIndex(), permission: 'report.view' },
                ],
            },
        ],
    },
    {
        label: 'Administration',
        items: [
            { title: 'User', href: userIndex(), icon: User, permission: 'user.view' },
            {
                title: 'Kiosks',
                href: '#',
                icon: Tablet,
                permission: 'device.manage',
                children: [
                    { title: 'Devices', href: KioskDevicesIndex(), permission: 'device.manage' },
                    { title: 'Welcome screens', href: KioskScreensIndex(), permission: 'device.manage' },
                    { title: 'Upsell rules', href: KioskUpsellIndex(), permission: 'device.manage' },
                ],
            },
            {
                title: 'Settings',
                href: '#',
                icon: Settings,
                permission: 'setting.view',
                children: [
                    { title: 'Configuration', href: ConfigurationIndex(), permission: 'setting.view' },
                    { title: 'Tax', href: TaxesIndex(), permission: 'setting.view' },
                    { title: 'Stations', href: StationsIndex(), permission: 'setting.view' },
                    { title: 'Devices', href: DevicesIndex(), permission: 'setting.view' },
                    { title: 'Audit Logs', href: AuditLogsIndex(), permission: 'setting.view' },
                ],
            },
        ],
    },
];

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { can } = useCan();

    const visible = (items: NavItem[]): NavItem[] =>
        items
            .filter((item) => !item.permission || can(item.permission))
            .map((item) => ({
                ...item,
                children: item.children?.filter((child) => !child.permission || can(child.permission)),
            }))
            // A group whose links are all hidden disappears too (a cashier sees no empty "Inventory").
            .filter((item) => item.children === undefined || item.children.length > 0);

    return (
        <Sidebar collapsible="icon" variant="floating">
            <SidebarHeader className="pb-2">
                <SidebarMenu>
                    <SidebarMenuItem className="border-b border-sidebar-border pb-2">
                        <SidebarMenuButton size="lg" asChild className="hover:bg-sidebar-accent/60">
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="gap-1 pt-1">
                {sections.map((section) => {
                    const items = visible(section.items);

                    return items.length > 0 ? (
                        <NavMain key={section.label ?? 'overview'} label={section.label} items={items} />
                    ) : null;
                })}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border pt-2">
                {footerNavItems.length > 0 && <NavFooter items={footerNavItems} className="mt-auto" />}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}