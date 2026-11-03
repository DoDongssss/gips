<?php

namespace App\Services\Menu;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;

class VariantService
{
    /**
     * Replace a product's variants with the submitted list.
     * Rows with an id are updated, rows without are created, missing ones are soft-deleted.
     * Exactly one variant ends up as the default.
     *
     * @param  array<int, array<string, mixed>>  $rows
     */
    public function sync(Product $product, array $rows): void
    {
        DB::transaction(function () use ($product, $rows) {
            $defaultIndex = collect($rows)->search(fn ($r) => ! empty($r['is_default']));
            if ($defaultIndex === false) {
                $defaultIndex = 0;
            }

            $keep = [];

            foreach (array_values($rows) as $i => $row) {
                $attrs = [
                    'name' => $row['name'],
                    'price_cents' => $row['price_cents'],
                    'is_default' => $i === $defaultIndex,
                    'is_active' => (bool) ($row['is_active'] ?? true),
                    'sort_order' => $i,
                ];

                $variant = ! empty($row['id'])
                    ? $product->variants()->find($row['id'])
                    : null;

                // The unique (product_id, name) index also covers soft-deleted rows,
                // so a re-added name restores the old row instead of colliding with it.
                $variant ??= ProductVariant::withTrashed()
                    ->where('product_id', $product->id)
                    ->where('name', $row['name'])
                    ->first();

                if ($variant) {
                    $variant->trashed() && $variant->restore();
                    $variant->update($attrs);
                } else {
                    $variant = $product->variants()->create($attrs);
                }

                $keep[] = $variant->id;
            }

            $product->variants()->whereNotIn('id', $keep)->get()->each->delete();
        });

        app(MenuService::class)->flush();
    }
}
