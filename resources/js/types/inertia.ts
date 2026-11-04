import type { Auth } from '@/types/auth';

/** Props shared on every Inertia page (see HandleInertiaRequests). */
export type SharedPageProps = {
    name: string;
    auth: Auth;
    sidebarOpen: boolean;
};
