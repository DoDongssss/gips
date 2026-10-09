import type { ReactNode } from 'react';

import { useCan } from '@/hooks/use-can';

type CanProps = {
    /** Render children only if the user has this permission. */
    permission?: string;
    /** Render children if the user has at least one of these permissions. */
    any?: string[];
    /** Shown when the check fails (nothing by default). */
    fallback?: ReactNode;
    children: ReactNode;
};

export function Can({ permission, any, fallback = null, children }: CanProps) {
    const { can, canAny } = useCan();

    const allowed = permission ? can(permission) : any ? canAny(any) : false;

    return <>{allowed ? children : fallback}</>;
}