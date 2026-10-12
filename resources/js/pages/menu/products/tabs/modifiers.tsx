import { Link, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { sync as syncModifiers } from '@/routes/menu/products/modifiers';
import type { AttachableGroup, ProductDetail } from '@/types/menu';

type Props = { product: ProductDetail; groups: AttachableGroup[] };

export function ModifiersTab({ product, groups }: Props) {
    const form = useForm<{ group_ids: number[] }>({ group_ids: product.modifier_group_ids });

    const byId = new Map(groups.map((group) => [group.id, group]));
    const selected = form.data.group_ids.map((id) => byId.get(id)).filter(Boolean) as AttachableGroup[];
    const available = groups.filter((group) => !form.data.group_ids.includes(group.id));

    function move(index: number, direction: -1 | 1) {
        const next = [...form.data.group_ids];

        [next[index], next[index + direction]] = [next[index + direction], next[index]];
        form.setData('group_ids', next);
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        form.put(syncModifiers.url(product.id), { preserveScroll: true });
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <div>
                <h3 className="text-sm font-medium">Shown to the customer, in this order</h3>
                {selected.length === 0 && <p className="text-muted-foreground mt-2 text-sm">No add-ons attached.</p>}

                <ul className="mt-2 space-y-2">
                    {selected.map((group, index) => (
                        <li key={group.id} className="flex items-center gap-2 rounded-md border p-2">
                            <div className="min-w-0 flex-1">
                                <p className="font-medium">{group.name}</p>
                                <p className="text-muted-foreground truncate text-xs">
                                    {group.selection_type === 'single' ? 'Pick one' : 'Pick several'}
                                    {group.is_required && ' · required'} · {group.options.join(', ')}
                                </p>
                            </div>
                            <Button type="button" size="icon" variant="ghost" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">
                                <ArrowUp className="size-4" />
                            </Button>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                disabled={index === selected.length - 1}
                                onClick={() => move(index, 1)}
                                aria-label="Move down"
                            >
                                <ArrowDown className="size-4" />
                            </Button>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={`Remove ${group.name}`}
                                onClick={() => form.setData('group_ids', form.data.group_ids.filter((id) => id !== group.id))}
                            >
                                <X className="text-destructive size-4" />
                            </Button>
                        </li>
                    ))}
                </ul>
            </div>

            {available.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium">Available groups</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {available.map((group) => (
                            <Button
                                key={group.id}
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => form.setData('group_ids', [...form.data.group_ids, group.id])}
                            >
                                <Plus className="size-3.5" /> {group.name}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {groups.length === 0 && (
                <p className="text-muted-foreground text-sm">
                    No modifier groups exist yet. Create them under{' '}
                    <Link href="/menu/modifier-groups" className="underline">
                        Menu → Modifiers
                    </Link>
                    .
                </p>
            )}

            <Button type="submit" disabled={form.processing}>
                Save add-ons
            </Button>
        </form>
    );
}