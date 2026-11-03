import { useForm } from '@inertiajs/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { IngredientSelect, UnitSelect } from '@/components/inventory/pickers';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { unitsFor, useIngredientOptions } from '@/hooks/use-ingredient-options';
import { useCan } from '@/hooks/use-can';
import { api } from '@/lib/api';
import { show, update } from '@/routes/modifier-recipes';

type Action = 'add' | 'remove' | 'replace';
type Row = { action: Action; ingredient_id: string; quantity: string; unit_id: string; replaces_ingredient_id: string };

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    modifier: { id: number; name: string } | null;
};

type ModifierResponse = {
    items: { ingredient_id: number; quantity: string; unit_id: number; action: Action; replaces_ingredient_id: number | null }[];
};

const actionLabels: Record<Action, string> = { add: 'Uses extra', remove: 'Leaves out', replace: 'Uses instead of' };

const blank = (): Row => ({ action: 'add', ingredient_id: '', quantity: '', unit_id: '', replaces_ingredient_id: '' });

/**
 * What choosing this modifier does to stock. Oat milk: "Uses 180 ml Oat milk instead of Whole milk".
 * Open it from a modifier in the group editor.
 */
export default function ModifierStockDialog({ open, onOpenChange, modifier }: Props) {
    const { can } = useCan();
    const canEdit = can('recipe.manage');
    const queryClient = useQueryClient();

    const { data: options } = useIngredientOptions(open);
    const effects = useQuery({
        queryKey: ['modifier-recipe', modifier?.id],
        queryFn: () => api<ModifierResponse>(show.url(modifier!.id)),
        enabled: open && modifier !== null,
        staleTime: 0,
    });

    const form = useForm<{ items: Row[] }>({ items: [] });
    const errors = form.errors as Record<string, string>;

    useEffect(() => {
        if (open && effects.data) {
            form.setData(
                'items',
                effects.data.items.map((item) => ({
                    action: item.action,
                    ingredient_id: String(item.ingredient_id),
                    quantity: String(Number(item.quantity)),
                    unit_id: String(item.unit_id),
                    replaces_ingredient_id: item.replaces_ingredient_id ? String(item.replaces_ingredient_id) : '',
                })),
            );
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, effects.data]);

    const patch = (index: number, change: Partial<Row>) => form.setData('items', form.data.items.map((row, i) => (i === index ? { ...row, ...change } : row)));

    function pickIngredient(index: number, ingredientId: string) {
        const ingredient = options?.ingredients.find((i) => String(i.id) === ingredientId);

        patch(index, { ingredient_id: ingredientId, unit_id: ingredient ? String(ingredient.base_unit_id) : '' });
    }

    function submit(event: FormEvent) {
        event.preventDefault();

        if (!modifier) {
            return;
        }

        form.transform((data) => ({
            items: data.items
                .filter((row) => row.ingredient_id && row.quantity.trim() !== '' && row.unit_id)
                .map((row) => ({
                    action: row.action,
                    ingredient_id: Number(row.ingredient_id),
                    quantity: row.quantity,
                    unit_id: Number(row.unit_id),
                    replaces_ingredient_id: row.action === 'replace' && row.replaces_ingredient_id ? Number(row.replaces_ingredient_id) : null,
                })),
        }));

        form.put(update.url(modifier.id), {
            preserveScroll: true,
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['modifier-recipe', modifier.id] });
                onOpenChange(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Stock effects: {modifier?.name}</DialogTitle>
                        <DialogDescription>
                            What stock changes when a customer picks this option. Leave empty if it uses nothing extra. <strong>Instead of</strong> removes that
                            ingredient from the recipe entirely and uses the amount given of the new one.
                        </DialogDescription>
                    </DialogHeader>

                    {(effects.isLoading || !options) && <p className="text-muted-foreground text-sm">Loading…</p>}

                    {options && (
                        <div className="space-y-2">
                            {form.data.items.length === 0 && !effects.isLoading && <p className="text-muted-foreground text-sm">No stock effects.</p>}

                            {form.data.items.map((row, index) => {
                                const units = unitsFor(options, row.ingredient_id);
                                const error =
                                    errors[`items.${index}.unit_id`] ?? errors[`items.${index}.replaces_ingredient_id`] ?? errors[`items.${index}.quantity`] ?? errors[`items.${index}.ingredient_id`];

                                return (
                                    <div key={index} className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                                            <Select value={row.action} onValueChange={(value) => patch(index, { action: value as Action })} disabled={!canEdit}>
                                                <SelectTrigger aria-label="Effect" className="w-36">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(Object.keys(actionLabels) as Action[]).map((action) => (
                                                        <SelectItem key={action} value={action}>
                                                            {actionLabels[action]}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Input
                                                className="w-24"
                                                inputMode="decimal"
                                                placeholder="Amount"
                                                aria-label="Amount"
                                                disabled={!canEdit}
                                                value={row.quantity}
                                                onChange={(e) => patch(index, { quantity: e.target.value })}
                                            />
                                            <UnitSelect value={row.unit_id} onChange={(value) => patch(index, { unit_id: value })} units={units} disabled={!canEdit} />
                                            <IngredientSelect value={row.ingredient_id} onChange={(value) => pickIngredient(index, value)} ingredients={options.ingredients} label="Ingredient" disabled={!canEdit} />

                                            {row.action === 'replace' && (
                                                <>
                                                    <span className="text-muted-foreground text-sm">instead of</span>
                                                    <IngredientSelect
                                                        value={row.replaces_ingredient_id}
                                                        onChange={(value) => patch(index, { replaces_ingredient_id: value })}
                                                        ingredients={options.ingredients}
                                                        label="Replaced ingredient"
                                                        placeholder="Replaced ingredient"
                                                        disabled={!canEdit}
                                                    />
                                                </>
                                            )}

                                            {canEdit && (
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className="ml-auto"
                                                    aria-label="Remove effect"
                                                    onClick={() => form.setData('items', form.data.items.filter((_, i) => i !== index))}
                                                >
                                                    <Trash2 className="text-destructive size-4" />
                                                </Button>
                                            )}
                                        </div>
                                        {error && <p className="text-destructive text-sm">{error}</p>}
                                    </div>
                                );
                            })}

                            {canEdit && (
                                <Button type="button" size="sm" variant="outline" onClick={() => form.setData('items', [...form.data.items, blank()])}>
                                    <Plus className="size-3.5" /> Add effect
                                </Button>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {canEdit ? 'Cancel' : 'Close'}
                        </Button>
                        {canEdit && (
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Saving…' : 'Save effects'}
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
