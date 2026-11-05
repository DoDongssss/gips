import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    /** Where the reason is posted. */
    url: string;
    confirmLabel: string;
};

const textareaClass =
    'border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

/** Asks why, then posts the reason. Used to reopen a closed shift or a closed day. */
export function ReopenDialog({ open, onOpenChange, title, description, url, confirmLabel }: Props) {
    const [reason, setReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const valid = reason.trim().length >= 3;

    function submit(event: FormEvent) {
        event.preventDefault();

        if (!valid) {
            return;
        }

        router.post(
            url,
            { reason: reason.trim() },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    setReason('');
                    onOpenChange(false);
                },
                onError: (errors) => toast.error(Object.values(errors)[0] ?? 'It could not be reopened.'),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>{description}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-1">
                        <label htmlFor="reopen-reason" className="text-sm font-medium">
                            Reason
                        </label>
                        <textarea
                            id="reopen-reason"
                            className={textareaClass}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="For example: closed by mistake"
                            maxLength={255}
                            autoFocus
                        />
                        <p className="text-muted-foreground text-xs">Saved in the audit log.</p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!valid || processing}>
                            {processing ? 'Working…' : confirmLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
