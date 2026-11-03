<?php

namespace App\Services\Menu;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Facades\Cache;

/**
 * Builds and caches the full menu that the POS and the kiosk read.
 * The cache holds every ACTIVE item (sold out ones included, flagged);
 * the default response filters out unavailable items in memory.
 */
class MenuService
{
    public const CACHE_KEY = 'menu.v2';

    /** @return array<int, array<string, mixed>> */
    public function menu(bool $includeUnavailable = false): array
    {
        $categories = Cache::rememberForever(self::CACHE_KEY, fn () => $this->build());

        if ($includeUnavailable) {
            return $categories;
        }

        return collect($categories)
            ->map(function (array $category) {
                $category['products'] = collect($category['products'])
                    ->filter(fn (array $p) => $p['is_available'])
                    ->map(function (array $p) {
                        $p['modifier_groups'] = collect($p['modifier_groups'])
                            ->map(function (array $g) {
                                $g['modifiers'] = collect($g['modifiers'])
                                    ->where('is_available', true)->values()->all();

                                return $g;
                            })->values()->all();

                        return $p;
                    })->values()->all();

                return $category;
            })
            ->filter(fn (array $c) => count($c['products']) > 0)
            ->values()
            ->all();
    }

    public function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /** @return array<int, array<string, mixed>> */
    private function build(): array
    {
        return Category::query()
            ->active()
            ->ordered()
            ->with([
                'products' => fn ($q) => $q->active()->ordered(),
                'products.variants' => fn ($q) => $q->where('is_active', true),
                'products.images',
                'products.modifierGroups' => fn ($q) => $q->where('modifier_groups.is_active', true),
                'products.modifierGroups.modifiers',
            ])
            ->get()
            ->map(fn (Category $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'sort_order' => $c->sort_order,
                'products' => $c->products->map(fn (Product $p) => $this->product($p))->values()->all(),
            ])
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    private function product(Product $p): array
    {
        return [
            'id' => $p->id,
            'category_id' => $p->category_id,
            'name' => $p->name,
            'slug' => $p->slug,
            'sku' => $p->sku,
            'description' => $p->description,
            'base_price_cents' => $p->base_price_cents,
            'is_taxable' => $p->is_taxable,
            'is_available' => $p->is_available,
            'prep_time_seconds' => $p->prep_time_seconds,
            'image_url' => $p->images->first()?->url,
            'images' => $p->images->map(fn ($i) => ['id' => $i->id, 'url' => $i->url, 'is_primary' => $i->is_primary])->values()->all(),
            'variants' => $p->variants->map(fn ($v) => [
                'id' => $v->id,
                'name' => $v->name,
                'price_cents' => $v->price_cents,
                'is_default' => $v->is_default,
            ])->values()->all(),
            'modifier_groups' => $p->modifierGroups->map(fn ($g) => [
                'id' => $g->id,
                'name' => $g->name,
                'selection_type' => $g->selection_type->value,
                'is_required' => $g->is_required,
                'min_select' => $g->min_select,
                'max_select' => $g->max_select,
                'modifiers' => $g->modifiers->map(fn ($m) => [
                    'id' => $m->id,
                    'name' => $m->name,
                    'price_delta_cents' => $m->price_delta_cents,
                    'is_default' => $m->is_default,
                    'is_available' => $m->is_available,
                ])->values()->all(),
            ])->values()->all(),
        ];
    }
}
