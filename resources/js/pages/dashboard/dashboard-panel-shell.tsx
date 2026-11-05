import { ChevronDown, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

import { Card } from './card';

export type DashboardPanelId = 'setup' | 'help';

const STORAGE_PREFIX = 'gip.dashboard.panel.';

function storageKey(panelId: DashboardPanelId): string {
    return `${STORAGE_PREFIX}${panelId}`;
}

export function readDashboardPanelHidden(panelId: DashboardPanelId): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.localStorage.getItem(storageKey(panelId)) === 'hidden';
}

export function restoreDashboardPanel(panelId: DashboardPanelId): void {
    window.localStorage.removeItem(storageKey(panelId));
    window.dispatchEvent(new CustomEvent('gip:dashboard-panel', { detail: { panelId, action: 'restore' } }));
}

type Props = {
    panelId: DashboardPanelId;
    title: string;
    subtitle?: ReactNode;
    className?: string;
    children: ReactNode;
};

export function DashboardPanelShell({ panelId, title, subtitle, className, children }: Props) {
    const [mounted, setMounted] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [open, setOpen] = useState(true);

    useEffect(() => {
        const key = storageKey(panelId);
        const stored = window.localStorage.getItem(key);
        setHidden(stored === 'hidden');
        setOpen(stored !== 'collapsed');
        setMounted(true);

        function onPanelEvent(event: Event) {
            const detail = (event as CustomEvent<{ panelId: DashboardPanelId; action: string }>).detail;
            if (detail?.panelId !== panelId) {
                return;
            }

            if (detail.action === 'restore') {
                setHidden(false);
                setOpen(true);
            }
        }

        window.addEventListener('gip:dashboard-panel', onPanelEvent);

        return () => window.removeEventListener('gip:dashboard-panel', onPanelEvent);
    }, [panelId]);

    function persist(next: 'open' | 'collapsed' | 'hidden') {
        const key = storageKey(panelId);
        if (next === 'open') {
            window.localStorage.removeItem(key);
            return;
        }

        window.localStorage.setItem(key, next);
    }

    if (!mounted || hidden) {
        return null;
    }

    return (
        <Card className={className}>
            <Collapsible
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen);
                    persist(nextOpen ? 'open' : 'collapsed');
                }}
            >
                <div className="flex items-start gap-2">
                    <CollapsibleTrigger className="hover:bg-muted/60 flex min-w-0 flex-1 items-start gap-2 rounded-md text-left transition-colors">
                        <ChevronDown className={cn('text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
                        <div className="min-w-0 space-y-0.5">
                            <h2 className="text-base font-semibold">{title}</h2>
                            {subtitle}
                        </div>
                    </CollapsibleTrigger>
                    <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1 transition-colors"
                        aria-label={`Hide ${title}`}
                        title="Hide"
                        onClick={() => {
                            setHidden(true);
                            persist('hidden');
                        }}
                    >
                        <X className="size-4" aria-hidden />
                    </button>
                </div>
                <CollapsibleContent className="pt-3">{children}</CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
