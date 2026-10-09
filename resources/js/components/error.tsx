import { Head, Link } from '@inertiajs/react';

import { Button } from '@/components/ui/button';

const messages: Record<number, { title: string; description: string }> = {
    403: {
        title: 'Access denied',
        description: "Your role doesn't have permission to open this page. Ask a manager if you need access.",
    },
    404: {
        title: 'Page not found',
        description: "The page you're looking for doesn't exist or was moved.",
    },
    419: {
        title: 'Session expired',
        description: 'Please refresh the page and try again.',
    },
    500: {
        title: 'Something went wrong',
        description: 'An unexpected error occurred. Please try again.',
    },
    503: {
        title: 'Service unavailable',
        description: "We're doing maintenance. Please try again shortly.",
    },
};

export default function ErrorPage({ status }: { status: number }) {
    const { title, description } = messages[status] ?? messages[500];

    return (
        <>
            <Head title={title} />
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
                <p className="text-muted-foreground text-sm font-medium">{status}</p>
                <h1 className="text-2xl font-semibold">{title}</h1>
                <p className="text-muted-foreground max-w-md">{description}</p>
                <Button asChild>
                    <Link href="/">Back to home</Link>
                </Button>
            </div>
        </>
    );
}