<?php

namespace App\Services\Menu;

use App\Models\Modifier;
use App\Models\ModifierGroup;
use App\Models\ModifierRecipeItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ModifierGroupCatalogService
{
    public function __construct(private readonly MenuService $menu) {}

    /** @return array<int, true> modifier ids that have stock rules */
    public function modifiersWithStockRules(array $modifierIds): array
    {
        if ($modifierIds === []) {
            return [];
        }

        return ModifierRecipeItem::query()
            ->whereIn('modifier_id', $modifierIds)
            ->distinct()
            ->pluck('modifier_id')
            ->mapWithKeys(fn ($id) => [(int) $id => true])
            ->all();
    }

    public function duplicate(ModifierGroup $source): ModifierGroup
    {
        return DB::transaction(function () use ($source) {
            $source->load('modifiers');

            $copy = $source->replicate();
            $copy->name = $this->copyName($source->name);
            $copy->save();
            $this->insertCopyAfter($source, $copy);

            $map = [];
            foreach ($source->modifiers as $modifier) {
                $newModifier = $copy->modifiers()->create($modifier->only([
                    'name', 'price_delta_cents', 'is_default', 'is_available', 'sort_order',
                ]));
                $map[$modifier->id] = $newModifier->id;
            }

            $items = ModifierRecipeItem::query()->whereIn('modifier_id', array_keys($map))->get();
            foreach ($items as $item) {
                ModifierRecipeItem::create([
                    'modifier_id' => $map[$item->modifier_id],
                    'ingredient_id' => $item->ingredient_id,
                    'quantity' => $item->quantity,
                    'unit_id' => $item->unit_id,
                    'action' => $item->action,
                    'replaces_ingredient_id' => $item->replaces_ingredient_id,
                ]);
            }

            $this->menu->flush();

            return $copy;
        });
    }

    public function move(ModifierGroup $group, int $delta): void
    {
        $ordered = ModifierGroup::query()->orderBy('sort_order')->orderBy('id')->pluck('id')->all();
        $index = array_search($group->id, $ordered, true);

        if ($index === false) {
            return;
        }

        $target = $index + $delta;

        if ($target < 0 || $target >= count($ordered)) {
            return;
        }

        [$ordered[$index], $ordered[$target]] = [$ordered[$target], $ordered[$index]];

        DB::transaction(function () use ($ordered) {
            foreach ($ordered as $position => $id) {
                ModifierGroup::whereKey($id)->update(['sort_order' => $position]);
            }
        });

        $this->menu->flush();
    }

    /** @param  array<int, int>  $ids */
    public function bulk(string $action, array $ids): int
    {
        $query = ModifierGroup::query()->whereIn('id', $ids);

        $count = match ($action) {
            'hide' => $query->update(['is_active' => false]),
            'show' => $query->update(['is_active' => true]),
            'delete' => tap($query->get(), function ($groups) {
                foreach ($groups as $group) {
                    $group->products()->detach();
                    $group->delete();
                }
            })->count(),
            default => abort(422, 'Unknown bulk action.'),
        };

        $this->menu->flush();

        return (int) $count;
    }

    public function restore(int $groupId): ModifierGroup
    {
        $group = ModifierGroup::onlyTrashed()->findOrFail($groupId);
        $group->restore();
        $this->menu->flush();

        return $group;
    }

    private function copyName(string $name): string
    {
        $base = Str::endsWith($name, ' (copy)') ? $name : "{$name} (copy)";
        $candidate = $base;
        $i = 2;

        while (ModifierGroup::withTrashed()->where('name', $candidate)->exists()) {
            $candidate = "{$base} {$i}";
            $i++;
        }

        return $candidate;
    }

    private function insertCopyAfter(ModifierGroup $source, ModifierGroup $copy): void
    {
        ModifierGroup::query()
            ->whereKeyNot($copy->id)
            ->where('sort_order', '>', $source->sort_order)
            ->increment('sort_order');

        $copy->update(['sort_order' => $source->sort_order + 1]);
    }
}
