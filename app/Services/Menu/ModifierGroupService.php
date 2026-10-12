<?php

namespace App\Services\Menu;

use App\Enums\SelectionType;
use App\Models\ModifierGroup;
use Illuminate\Support\Facades\DB;

class ModifierGroupService
{
    /** @param  array<string, mixed>  $data */
    public function save(?ModifierGroup $group, array $data): ModifierGroup
    {
        $group = DB::transaction(function () use ($group, $data) {
            $type = SelectionType::from($data['selection_type']);
            $required = (bool) ($data['is_required'] ?? false);
            $min = (int) ($data['min_select'] ?? 0);
            $max = $data['max_select'] ?? null;

            if ($type === SelectionType::Single) {
                $min = $required ? 1 : 0;
                $max = 1;
            } elseif ($required) {
                $min = max($min, 1);
            }

            $attrs = [
                'name' => $data['name'],
                'selection_type' => $type,
                'is_required' => $required,
                'min_select' => $min,
                'max_select' => $max,
                'is_active' => (bool) ($data['is_active'] ?? true),
            ];

            if (! $group) {
                $attrs['sort_order'] = ((int) ModifierGroup::withTrashed()->max('sort_order')) + 1;
                $group = ModifierGroup::create($attrs);
            } else {
                $group->update($attrs);
            }

            $keep = [];
            foreach (array_values($data['modifiers']) as $i => $row) {
                $modifier = ! empty($row['id']) ? $group->modifiers()->find($row['id']) : null;

                $modifierAttrs = [
                    'name' => $row['name'],
                    'price_delta_cents' => $row['price_delta_cents'] ?? 0,
                    'is_default' => (bool) ($row['is_default'] ?? false),
                    'is_available' => (bool) ($row['is_available'] ?? true),
                    'sort_order' => $i,
                ];

                $modifier
                    ? $modifier->update($modifierAttrs)
                    : $modifier = $group->modifiers()->create($modifierAttrs);

                $keep[] = $modifier->id;
            }

            $group->modifiers()->whereNotIn('id', $keep)->get()->each->delete();

            return $group;
        });

        app(MenuService::class)->flush();

        return $group;
    }
}
