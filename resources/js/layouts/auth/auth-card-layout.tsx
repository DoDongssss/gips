import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { PropsWithChildren } from 'react';

import DemoAccountsCard, { type DemoAccount } from '@/layouts/auth/demo-accounts-card';
import { home } from '@/routes';

type AuthPageProps = {
    demoAccounts?: DemoAccount[] | null;
};

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    const { demoAccounts } = usePage<AuthPageProps>().props;
    const demos = demoAccounts?.length ? demoAccounts : null;

    return (
        <main className="w-full max-w-md">
            <div className="mx-auto w-full">
                {(title || description) && (
                    <div className="mb-8">
                        {title && <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>}
                        {description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>}
                    </div>
                )}

                {demos && <DemoAccountsCard accounts={demos} className="mb-3" />}

                <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">{children}</div>

                <Link
                    href={home()}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <ArrowLeft className="size-4" aria-hidden />
                    Back to home
                </Link>
            </div>
        </main>
    );
}
