import { HelpCircle } from 'lucide-react';

import { DashboardPanelShell } from '@/pages/dashboard/dashboard-panel-shell';

type Props = {
    help: {
        register: string;
        kiosk: string;
        reports: string;
    };
};

export function HelpPanel({ help }: Props) {
    return (
        <DashboardPanelShell panelId="help" title="Quick help">
            <div className="flex gap-2 text-sm">
                <HelpCircle className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden />
                <div className="space-y-3">
                    <div>
                        <p className="font-medium">Register & payments</p>
                        <p className="text-muted-foreground">{help.register}</p>
                    </div>
                    <div>
                        <p className="font-medium">Kiosk</p>
                        <p className="text-muted-foreground">{help.kiosk}</p>
                    </div>
                    <div>
                        <p className="font-medium">Reports</p>
                        <p className="text-muted-foreground">{help.reports}</p>
                    </div>
                </div>
            </div>
        </DashboardPanelShell>
    );
}
