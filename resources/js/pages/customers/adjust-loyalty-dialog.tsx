import { router } from '@inertiajs/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: { id: number; name: string; loyalty_points: number };
};

export default function AdjustLoyaltyDialog({ open, onOpenChange, customer }: Props) {
    const [points, setPoints] = useState('');
    const [note, setNote] = useState('');
    const [pending, setPending] = useState(false);

    function submit(event: React.FormEvent) {
        event.preventDefault();
        setPending(true);

        router.post(
            `/customers/${customer.id}/loyalty-adjustment`,
            { points: Number(points), note },
            {
                preserveScroll: true,
                onFinish: () => setPending(false),
                onSuccess: () => {
                    setPoints('');
                    setNote('');
                    onOpenChange(false);
                },
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>Adjust loyalty points</DialogTitle>
                        <DialogDescription>
                            Current balance for {customer.name}: {customer.loyalty_points} point(s). Use a negative number to remove points.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="loyalty-points">Change (+/−)</Label>
                            <Input
                                id="loyalty-points"
                                type="number"
                                value={points}
                                onChange={(event) => setPoints(event.target.value)}
                                required
                                step={1}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="loyalty-note">Reason</Label>
                            <Textarea id="loyalty-note" value={note} onChange={(event) => setNote(event.target.value)} required minLength={3} maxLength={255} rows={3} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={pending}>
                            {pending ? 'Saving…' : 'Apply adjustment'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
