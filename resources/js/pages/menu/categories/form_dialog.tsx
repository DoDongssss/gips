import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { store, update } from '@/routes/menu/categories';

export type CategoryRecord = {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    products_count: number;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    category?: CategoryRecord;
};

export default function CategoryFormDialog({ open, onOpenChange, mode, category }: Props) {
    const isEdit = mode === 'edit' && category !== undefined;

    const form = useForm({
        name: '',
        description: '',
        is_active: true,
    });

    // Refill every time the dialog opens: blank for create, the row for edit.
    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            name: category?.name ?? '',
            description: category?.description ?? '',
            is_active: category?.is_active ?? true,
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, category?.id, mode]);

    function submit(event: FormEvent) {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (isEdit) {
            form.put(update.url(category.id), options);
        } else {
            form.post(store.url(), options);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Edit category' : 'New category'}</DialogTitle>
                        <DialogDescription>Categories group products on the POS and kiosk.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="category-name">Name</Label>
                        <Input
                            id="category-name"
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            autoFocus
                        />
                        {form.errors.name && <p className="text-destructive text-sm">{form.errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category-description">Description (optional)</Label>
                        <Textarea
                            id="category-description"
                            rows={2}
                            value={form.data.description}
                            onChange={(event) => form.setData('description', event.target.value)}
                        />
                        {form.errors.description && <p className="text-destructive text-sm">{form.errors.description}</p>}
                    </div>

                    <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                            <Label htmlFor="category-active">Show on POS and kiosk</Label>
                            <p className="text-muted-foreground text-sm">Turn off to hide the whole category.</p>
                        </div>
                        <Switch
                            id="category-active"
                            checked={form.data.is_active}
                            onCheckedChange={(value) => form.setData('is_active', value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEdit ? 'Save changes' : 'Create category'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}