import AuthLayoutTemplate from '@/layouts/auth/auth-card-layout';

export default function AuthLayout({
    title,
    description,
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-svh items-center justify-center bg-background px-4 py-6 sm:px-6">
            <AuthLayoutTemplate title={title} description={description}>
                {children}
            </AuthLayoutTemplate>
        </div>
    );
}
