import { usePage } from '@inertiajs/react';

import type { SharedPageProps } from '@/types/inertia';

/**
 * Client-side permission checks. This only controls what the UI shows;
 * the server must enforce the same permission on every route.
 */
export function useCan() {
    const { auth } = usePage<SharedPageProps>().props;

    const roles = auth?.roles ?? [];
    const permissions = auth?.permissions ?? [];
    const isSuperAdmin = roles.includes('superadmin');

    const can = (permission: string): boolean =>
        isSuperAdmin || permissions.includes(permission);

    const canAny = (list: string[]): boolean => list.some(can);

    const hasRole = (role: string): boolean => roles.includes(role);

    return { can, canAny, hasRole, isSuperAdmin };
}