import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { pesosToCents } from '@/lib/money';
import { store } from '@/routes/menu/products';
import type { Option } from '@/types/menu';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: Option[];
};

// Creating a product only asks for the basics. Editing (details, sizes, images,
// add-ons) happens on the product's own page, which this redirects to after saving.
export default function ProductFormDialog({ open, onOpenChange, categories }: Props) {
    const form = useForm({ name: '', category_id: '', price: '' });

    useEffect(() => {
        if (open) {
            form.reset();
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            name: data.name,
            category_id: data.category_id,
            base_price_cents: pesosToCents(data.price),
        }));

        form.post(store.url(), {
            onSuccess: () => onOpenChange(false), 
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>New product</DialogTitle>
                        <DialogDescription>Start with the basics. Sizes, images and add-ons come next.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="product-name">Name</Label>
                        <Input
                            id="product-name"
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            autoFocus
                        />
                        {form.errors.name && <p className="text-destructive text-sm">{form.errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={form.data.category_id} onValueChange={(value) => form.setData('category_id', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((category) => (
                                    <SelectItem key={category.id} value={String(category.id)}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {form.errors.category_id && <p className="text-destructive text-sm">{form.errors.category_id}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="product-price">Price (₱)</Label>
                        <Input
                            id="product-price"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={form.data.price}
                            onChange={(event) => form.setData('price', event.target.value)}
                        />
                        <p className="text-muted-foreground text-xs">If the product has sizes, each size gets its own price on the next screen.</p>
                        {(form.errors as Record<string, string>).base_price_cents && (
                            <p className="text-destructive text-sm">{(form.errors as Record<string, string>).base_price_cents}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Create and continue
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}