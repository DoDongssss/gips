import { Link } from '@inertiajs/react';
import { CheckCircle2, Circle } from 'lucide-react';

import { DashboardPanelShell } from '@/pages/dashboard/dashboard-panel-shell';

export type SetupStep = {
    key: string;
    label: string;
    description: string;
    done: boolean;
    href: string | null;
};

type Props = {
    setup: {
        complete: boolean;
        completed_count: number;
        total_count: number;
        steps: SetupStep[];
    };
};

export function SetupChecklist({ setup }: Props) {
    if (setup.complete) {
        return null;
    }

    return (
        <DashboardPanelShell
            panelId="setup"
            title="Store setup"
            className="border-primary/20 bg-primary/5"
            subtitle={
                <p className="text-muted-foreground text-sm">
                    {setup.completed_count} of {setup.total_count} steps done — finish these before going live.
                </p>
            }
        >
            <ul className="space-y-2">
                {setup.steps.map((step) => (
                    <li key={step.key} className="flex gap-3 text-sm">
                        {step.done ? (
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                        ) : (
                            <Circle className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
                        )}
                        <div className="min-w-0">
                            {step.href && !step.done ? (
                                <Link href={step.href} className="font-medium text-primary hover:underline">
                                    {step.label}
                                </Link>
                            ) : (
                                <span className="font-medium">{step.label}</span>
                            )}
                            <p className="text-muted-foreground">{step.description}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </DashboardPanelShell>
    );
}
