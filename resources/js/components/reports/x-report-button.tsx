import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { printXReport, XReportPaper } from '@/components/reports/report-paper';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { errorMessages } from '@/lib/api';
import { makeXReport } from '@/lib/pos-api';
import type { XReport } from '@/lib/reports';

type Props = {
    scope: 'shift' | 'day';
    label?: string;
    variant?: 'default' | 'outline' | 'ghost';
};

/** One click: builds a mid-day snapshot, shows it, and can print it. Nothing is reset. */
export function XReportButton({ scope, label = 'X report', variant = 'outline' }: Props) {
    const [report, setReport] = useState<XReport | null>(null);

    const generate = useMutation({
        mutationFn: () => makeXReport(scope),
        onSuccess: setReport,
        onError: (error) => toast.error(errorMessages(error)[0]),
    });

    return (
        <>
            <Button type="button" variant={variant} disabled={generate.isPending} onClick={() => generate.mutate()}>
                {generate.isPending ? 'Working…' : label}
            </Button>

            <Dialog open={report !== null} onOpenChange={(open) => !open && setReport(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>X report</DialogTitle>
                        <DialogDescription>A snapshot of right now. It does not close the shift or the day.</DialogDescription>
                    </DialogHeader>

                    {report && (
                        <div className="rounded-md border bg-white p-2">
                            <XReportPaper report={report} />
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setReport(null)}>
                            Close
                        </Button>
                        <Button type="button" onClick={() => report && printXReport(report)}>
                            Print
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
