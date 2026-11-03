import { Link } from '@inertiajs/react';

import { Button } from '@/components/ui/button';

type Props = {
    currentPage: number;
    lastPage: number;
    prevUrl: string | null;
    nextUrl: string | null;
    /** Props to request on a page change. Needed when the table data is an optional prop. */
    only?: string[];
};

export function Pager({ currentPage, lastPage, prevUrl, nextUrl, only }: Props) {
    if (lastPage <= 1) return null;

    return (
        <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
                Page {currentPage} of {lastPage}
            </p>
            <div className="flex gap-2">
                {prevUrl ? (
                    <Button variant="outline" size="sm" asChild>
                        <Link href={prevUrl} only={only} preserveState>
                            Previous
                        </Link>
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" disabled>
                        Previous
                    </Button>
                )}
                {nextUrl ? (
                    <Button variant="outline" size="sm" asChild>
                        <Link href={nextUrl} only={only} preserveState>
                            Next
                        </Link>
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" disabled>
                        Next
                    </Button>
                )}
            </div>
        </div>
    );
}