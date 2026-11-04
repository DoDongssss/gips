<?php

namespace App\Services\Menu;

use App\Models\Product;
use App\Models\Recipe;
use App\Services\Inventory\CostReportService;
use App\Services\Inventory\UnitConverter;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductCatalogService
{
    public function __construct(
        private readonly MenuService $menu,
        private readonly UnitConverter $units,
        private readonly CostReportService $costReports,
    ) {}

    /**
     * @param  EloquentCollection<int, Product>  $products
     * @return array<int, string> product id => none|ok|needs_conversion
     */
    public function recipeStatuses(EloquentCollection $products): array
    {
        if ($products->isEmpty()) {
            return [];
        }

        $recipes = Recipe::query()
            ->whereIn('product_id', $products->pluck('id'))
            ->whereHas('items')
            ->with('items.ingredient')
            ->get()
            ->groupBy('product_id');

        $out = [];

        foreach ($products as $product) {
            $group = $recipes->get($product->id, collect());
            if ($group->isEmpty()) {
                $out[$product->id] = 'none';

                continue;
            }

            $status = 'ok';
            foreach ($group as $recipe) {
                foreach ($recipe->items as $item) {
                    if (! $this->units->canConvert($item->unit_id, $item->ingredient->base_unit_id)) {
                        $status = 'needs_conversion';
                        break 2;
                    }
                }
            }

            $out[$product->id] = $status;
        }

        return $out;
    }

    public function duplicate(Product $source): Product
    {
        return DB::transaction(function () use ($source) {
            $source->load(['variants', 'images', 'modifierGroups', 'recipes.items']);

            $copy = $source->replicate(['slug', 'sku']);
            $copy->name = $this->copyName($source->name);
            $copy->slug = null;
            $copy->sku = null;
            $copy->sort_order = ((int) Product::withTrashed()
                ->where('category_id', $source->category_id)->max('sort_order')) + 1;
            $copy->save();

            $variantMap = [];
            foreach ($source->variants as $variant) {
                $newVariant = $copy->variants()->create([
                    'name' => $variant->name,
                    'price_cents' => $variant->price_cents,
                    'is_default' => $variant->is_default,
                    'is_active' => $variant->is_active,
                    'sort_order' => $variant->sort_order,
                ]);
                $variantMap[$variant->id] = $newVariant->id;
            }

            foreach ($source->images as $image) {
                $path = $this->copyImagePath($image->path, $copy->id);
                $copy->images()->create([
                    'path' => $path,
                    'alt' => $image->alt,
                    'is_primary' => $image->is_primary,
                    'sort_order' => $image->sort_order,
                ]);
            }

            $copy->modifierGroups()->sync(
                $source->modifierGroups->mapWithKeys(fn ($group, $i) => [$group->id => ['sort_order' => $group->pivot->sort_order ?? $i]])->all()
            );

            foreach ($source->recipes as $recipe) {
                $variantId = $recipe->product_variant_id ? ($variantMap[$recipe->product_variant_id] ?? null) : null;

                if ($recipe->product_variant_id && $variantId === null) {
                    continue;
                }

                $newRecipe = $copy->recipes()->create([
                    'product_variant_id' => $variantId,
                    'yield_quantity' => $recipe->yield_quantity,
                    'notes' => $recipe->notes,
                ]);

                foreach ($recipe->items as $item) {
                    $newRecipe->items()->create([
                        'ingredient_id' => $item->ingredient_id,
                        'quantity' => $item->quantity,
                        'unit_id' => $item->unit_id,
                    ]);
                }
            }

            $this->menu->flush();

            return $copy;
        });
    }

    public function move(Product $product, int $delta): void
    {
        $ordered = Product::query()
            ->where('category_id', $product->category_id)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->pluck('id')
            ->all();

        $index = array_search($product->id, $ordered, true);

        if ($index === false) {
            return;
        }

        $target = $index + $delta;

        if ($target < 0 || $target >= count($ordered)) {
            return;
        }

        [$ordered[$index], $ordered[$target]] = [$ordered[$target], $ordered[$index]];
        $this->reorderInCategory($product->category_id, $ordered);
    }

    /** @param  array<int, int>  $ids */
    public function reorderInCategory(int $categoryId, array $ids): void
    {
        $products = Product::query()->where('category_id', $categoryId)->whereIn('id', $ids)->pluck('id');

        if ($products->count() !== count($ids)) {
            abort(422, 'Every product must belong to the selected category.');
        }

        DB::transaction(function () use ($ids) {
            foreach (array_values($ids) as $position => $id) {
                Product::whereKey($id)->update(['sort_order' => $position]);
            }
        });

        $this->menu->flush();
    }

    /**
     * @param  array<int, int>  $ids
     * @param  array{category_id?: int}  $extra
     */
    public function bulk(string $action, array $ids, array $extra = []): int
    {
        $query = Product::query()->whereIn('id', $ids);

        $count = match ($action) {
            'sold_out' => $query->update(['is_available' => false]),
            'available' => $query->update(['is_available' => true]),
            'hide' => $query->update(['is_active' => false]),
            'show' => $query->update(['is_active' => true]),
            'move_category' => $query->update(['category_id' => (int) ($extra['category_id'] ?? 0)]),
            'delete' => tap($query->get(), fn ($products) => $products->each->delete())->count(),
            default => abort(422, 'Unknown bulk action.'),
        };

        $this->menu->flush();

        return (int) $count;
    }

    public function restore(int $productId): Product
    {
        $product = Product::onlyTrashed()->findOrFail($productId);
        $product->restore();
        $this->menu->flush();

        return $product;
    }

    /** @return array{cost_cents: int|null, margin_cents: int|null, food_cost_pct: float|null, needs_conversion: bool}|null */
    public function marginPreview(Product $product): ?array
    {
        return $this->costReports->marginForProduct($product);
    }

    private function copyName(string $name): string
    {
        $base = Str::endsWith($name, ' (copy)') ? $name : "{$name} (copy)";
        $candidate = $base;
        $i = 2;

        while (Product::withTrashed()->where('name', $candidate)->exists()) {
            $candidate = "{$base} {$i}";
            $i++;
        }

        return $candidate;
    }

    private function copyImagePath(string $path, int $productId): string
    {
        $disk = Storage::disk('public');

        if (! $disk->exists($path)) {
            return $path;
        }

        $extension = pathinfo($path, PATHINFO_EXTENSION);
        $target = 'products/'.$productId.'/'.Str::uuid().($extension ? ".{$extension}" : '');
        $disk->copy($path, $target);

        return $target;
    }
}
