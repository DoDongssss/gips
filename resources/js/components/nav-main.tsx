import { Link } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
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
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

const itemClass = [
    'h-9 bg-transparent text-[0.85rem] font-normal text-gray-300',
    // hover
    'hover:bg-transparent hover:text-white',
    // pressed / click
    'active:bg-transparent active:text-white',
    // selected
    'data-[active=true]:bg-transparent data-[active=true]:font-normal data-[active=true]:text-white',
    'data-[active=true]:hover:bg-transparent data-[active=true]:hover:text-white',
    // collapsible open
    'data-[state=open]:bg-transparent data-[state=open]:text-white',
    'data-[state=open]:hover:bg-transparent data-[state=open]:hover:text-white',
].join(' ');

const subItemClass = [
    'h-8 translate-x-0 rounded-none bg-transparent px-4 text-[0.85rem] font-normal text-gray-500',
    'hover:bg-transparent hover:text-[#2079c7]',
    'active:bg-transparent active:text-[#2079c7]',
    'data-[active=true]:bg-transparent data-[active=true]:font-normal data-[active=true]:text-[#2079c7]',
].join(' ');

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="px-2 py-0">
            {/* <SidebarGroupLabel className="font-black">Platform</SidebarGroupLabel> */}
            <SidebarMenu className="gap-1">
                {items.map((item) => {
                    if (item.children?.length) {
                        const hasActiveChild = item.children.some((c) =>
                            isCurrentUrl(c.href),
                        );

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
                                            <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>

                                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                                        <SidebarMenuSub className="mx-0 mt-2 translate-x-0 gap-1 rounded-md border-l-0 bg-white px-0 py-2 shadow-sm">
                                            {item.children.map((child) => (
                                                <SidebarMenuSubItem key={child.title}>
                                                    <SidebarMenuSubButton
                                                        asChild
                                                        isActive={isCurrentUrl(child.href)}
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
                                isActive={isCurrentUrl(item.href)}
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