import ConfigurationGroupForm from '@/pages/configurations/group-form';
import type { SettingGroup } from '@/pages/configurations/group-form';
import { useCan } from '@/hooks/use-can';

import { index } from '@/routes/configurations'

export default function Index({ groups }: { groups: SettingGroup[] }) {
    const { can } = useCan();
    const canUpdate = can('setting.update');

    return (
        <>
             <div className="space-y-6 p-4">
                <div>
                    <h1 className="text-xl font-semibold">Store configuration</h1>
                    <p className="text-muted-foreground text-sm">
                        {canUpdate
                            ? 'Each section saves on its own.'
                            : 'You can view these configuration but not change them.'}
                    </p>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    {groups.map((group) => (
                        <ConfigurationGroupForm key={group.key} group={group} canUpdate={canUpdate} />
                    ))}
                </div>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Configurations',
            href: index(),
        },
    ],
};

