import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { update } from '@/routes/customers';

type CustomerInput = {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    notes?: string | null;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: CustomerInput;
};

export default function CustomerFormDialog({ open, onOpenChange, customer }: Props) {
    const [name, setName] = useState(customer.name);
    const [phone, setPhone] = useState(customer.phone ?? '');
    const [email, setEmail] = useState(customer.email ?? '');
    const [notes, setNotes] = useState(customer.notes ?? '');
    const [pending, setPending] = useState(false);

    useEffect(() => {
        if (open) {
            setName(customer.name);
            setPhone(customer.phone ?? '');
            setEmail(customer.email ?? '');
            setNotes(customer.notes ?? '');
        }
    }, [open, customer]);

    function submit(event: React.FormEvent) {
        event.preventDefault();
        setPending(true);

        router.patch(
            update.url(customer.id),
            { name, phone: phone.trim() || null, email: email.trim() || null, notes: notes.trim() || null },
            {
                preserveScroll: true,
                onFinish: () => setPending(false),
                onSuccess: () => onOpenChange(false),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>Edit customer</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="customer-name">Name</Label>
                            <Input id="customer-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer-phone">Phone</Label>
                            <Input id="customer-phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" maxLength={30} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer-email">Email</Label>
                            <Input id="customer-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={190} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer-notes">Notes</Label>
                            <Textarea id="customer-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={500} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={pending}>
                            {pending ? 'Saving…' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
