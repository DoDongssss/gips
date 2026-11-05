import { useEffect, useState } from 'react';

import { type DashboardPanelId, readDashboardPanelHidden, restoreDashboardPanel } from './dashboard-panel-shell';

type Props = {
    setupAvailable: boolean;
    helpAvailable: boolean;
};

export function HiddenDashboardPanelsBar({ setupAvailable, helpAvailable }: Props) {
    const [hiddenSetup, setHiddenSetup] = useState(false);
    const [hiddenHelp, setHiddenHelp] = useState(false);

    useEffect(() => {
        function refresh() {
            setHiddenSetup(setupAvailable && readDashboardPanelHidden('setup'));
            setHiddenHelp(helpAvailable && readDashboardPanelHidden('help'));
        }

        refresh();
        window.addEventListener('gip:dashboard-panel', refresh);

        return () => window.removeEventListener('gip:dashboard-panel', refresh);
    }, [setupAvailable, helpAvailable]);

    if ((!setupAvailable || !hiddenSetup) && (!helpAvailable || !hiddenHelp)) {
        return null;
    }

    function restore(panelId: DashboardPanelId) {
        restoreDashboardPanel(panelId);
        if (panelId === 'setup') {
            setHiddenSetup(false);
        } else {
            setHiddenHelp(false);
        }
    }

    return (
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span>Hidden panels:</span>
            {setupAvailable && hiddenSetup && (
                <button type="button" className="text-primary font-medium hover:underline" onClick={() => restore('setup')}>
                    Show store setup
                </button>
            )}
            {helpAvailable && hiddenHelp && (
                <button type="button" className="text-primary font-medium hover:underline" onClick={() => restore('help')}>
                    Show quick help
                </button>
            )}
        </p>
    );
}
