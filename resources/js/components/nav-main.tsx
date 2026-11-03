import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';

// All colors come from the --sidebar-* variables in app.css, so the look is changed in one place.

const labelClass =
    'px-3 text-[0.6875rem] font-semibold tracking-wider text-sidebar-foreground/40 uppercase';

// A main item. The thin bar on the left appears when the page is active.
const itemClass = [
    'relative h-10 gap-3 rounded-lg px-3 text-[0.875rem] font-medium text-sidebar-foreground/75 transition-colors',
    'hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
    'active:bg-sidebar-accent active:text-sidebar-accent-foreground',
    'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground',
    'data-[state=open]:text-sidebar-accent-foreground',
    '[&>svg]:text-sidebar-foreground/55 data-[active=true]:[&>svg]:text-sidebar-primary hover:[&>svg]:text-sidebar-accent-foreground',
    'before:absolute before:top-2 before:bottom-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-sidebar-primary',
    'before:opacity-0 before:transition-opacity data-[active=true]:before:opacity-100',
].join(' ');

// A link inside an open group. It hangs off a vertical guide line.
const subItemClass = [
    'relative h-8 translate-x-0 rounded-md pr-2 pl-5 text-[0.8125rem] font-normal text-sidebar-foreground/60 transition-colors',
    'hover:bg-transparent hover:text-sidebar-accent-foreground',
    'active:bg-transparent active:text-sidebar-accent-foreground',
    'data-[active=true]:bg-transparent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground',
    'before:absolute before:top-1 before:bottom-1 before:-left-px before:w-0.5 before:rounded-full before:bg-sidebar-primary',
    'before:opacity-0 before:transition-opacity data-[active=true]:before:opacity-100',
].join(' ');

const pathOf = (href: NavItem['href']): string => (typeof href === 'string' ? href : href.url);

/** Active on the page itself and on pages below it (for example /menu/products/5/edit). */
function useIsActive() {
    const { url } = usePage();
    const current = url.split('?')[0];

    return (href: NavItem['href']): boolean => {
        const path = pathOf(href).split('?')[0];

        if (path === '#' || path === '') {
            return false;
        }

        return current === path || current.startsWith(`${path}/`);
    };
}

export function NavMain({ items = [], label }: { items: NavItem[]; label?: string }) {
    const isActive = useIsActive();

    return (
        <SidebarGroup className="px-2 py-1">
            {label && <SidebarGroupLabel className={labelClass}>{label}</SidebarGroupLabel>}
            <SidebarMenu className="gap-0.5">
                {items.map((item) => {
                    if (item.children?.length) {
                        const hasActiveChild = item.children.some((c) => isActive(c.href));

                        return (
                            <Collapsible
                                key={item.title}
                                asChild
                                defaultOpen={hasActiveChild}
                                className="group/collapsible"
                            >
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton
                                            tooltip={{ children: item.title }}
                                            isActive={hasActiveChild}
                                            className={itemClass}
                                        >
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                            <ChevronRight className="ml-auto size-4 opacity-60 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>

                                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                                        <SidebarMenuSub className="mx-[1.375rem] mt-1 mb-1 translate-x-0 gap-0.5 border-l border-sidebar-border px-0 py-0.5">
                                            {item.children.map((child) => (
                                                <SidebarMenuSubItem key={child.title}>
                                                    <SidebarMenuSubButton
                                                        asChild
                                                        isActive={isActive(child.href)}
                                                        className={subItemClass}
                                                    >
                                                        <Link href={child.href} prefetch>
                                                            <span>{child.title}</span>
                                                        </Link>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        );
                    }

                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={isActive(item.href)}
                                tooltip={{ children: item.title }}
                                className={itemClass}
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}