import { Link } from '@inertiajs/react';

import { Button } from '@/components/ui/button';

type Props = {
    currentPage: number;
    lastPage: number;
    prevUrl: string | null;
    nextUrl: string | null;
};

/** Previous / Next under a paginated table. Hidden when there is only one page. */
export function Pager({ currentPage, lastPage, prevUrl, nextUrl }: Props) {
    if (lastPage <= 1) {
        return null;
    }

    return (
        <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
                Page {currentPage} of {lastPage}
            </p>
            <div className="flex gap-2">
                {prevUrl ? (
                    <Button variant="outline" size="sm" asChild>
                        <Link href={prevUrl} preserveState preserveScroll>
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
                        <Link href={nextUrl} preserveState preserveScroll>
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
