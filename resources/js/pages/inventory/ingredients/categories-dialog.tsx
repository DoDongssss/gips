import { router, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Field } from '@/components/inventory/field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { destroy, store, update } from '@/routes/inventory/categories';
import type { IngredientCategory } from '@/types/inventory';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; categories: IngredientCategory[] };

/** Add, rename and remove ingredient categories in one place. Removing one only clears it from its ingredients. */
export default function CategoriesDialog({ open, onOpenChange, categories }: Props) {
    const form = useForm({ name: '' });
    const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
    const errors = form.errors as Record<string, string>;

    function add(event: FormEvent) {
        event.preventDefault();
        form.post(store.url(), { preserveScroll: true, onSuccess: () => form.reset() });
    }

    function saveRename() {
        if (editing) {
            router.put(update.url(editing.id), { name: editing.name }, { preserveScroll: true, onSuccess: () => setEditing(null) });
        }
    }

    function remove(category: IngredientCategory) {
        if (confirm(`Delete "${category.name}"? Its ingredients keep working, they just lose the category.`)) {
            router.delete(destroy.url(category.id), { preserveScroll: true });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ingredient categories</DialogTitle>
                    <DialogDescription>Groups for the ingredient list, like Dairy, Coffee or Packaging.</DialogDescription>
                </DialogHeader>

                <form onSubmit={add} className="flex items-end gap-2">
                    <div className="flex-1">
                        <Field id="cat-name" label="New category" error={errors.name}>
                            <Input id="cat-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                        </Field>
                    </div>
                    <Button type="submit" disabled={form.processing || form.data.name.trim() === ''}>
                        Add
                    </Button>
                </form>

                <ul className="max-h-72 divide-y overflow-y-auto rounded-md border">
                    {categories.map((category) => (
                        <li key={category.id} className="flex items-center gap-2 p-2">
                            {editing?.id === category.id ? (
                                <>
                                    <Input aria-label="Category name" value={editing.name} onChange={(e) => setEditing({ id: category.id, name: e.target.value })} />
                                    <Button size="sm" onClick={saveRename}>
                                        Save
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <span className="flex-1 text-sm">{category.name}</span>
                                    <Button size="sm" variant="outline" onClick={() => setEditing({ id: category.id, name: category.name })}>
                                        Rename
                                    </Button>
                                    <Button size="icon" variant="ghost" aria-label={`Delete ${category.name}`} onClick={() => remove(category)}>
                                        <Trash2 className="text-destructive size-4" />
                                    </Button>
                                </>
                            )}
                        </li>
                    ))}
                    {categories.length === 0 && <li className="text-muted-foreground p-4 text-center text-sm">No categories yet.</li>}
                </ul>
            </DialogContent>
        </Dialog>
    );
}
