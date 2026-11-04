<?php

namespace App\Services\Menu;

use App\Models\Category;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CategoryCatalogService
{
    public function __construct(private readonly MenuService $menu) {}

    public function syncStation(Category $category, ?int $stationId): void
    {
        if ($stationId === null) {
            DB::table('category_stations')->where('category_id', $category->id)->delete();

            return;
        }

        DB::table('category_stations')->updateOrInsert(
            ['category_id' => $category->id],
            ['station_id' => $stationId, 'created_at' => now(), 'updated_at' => now()],
        );
    }

    /** @return array<int, int|null> category id => station id */
    public function stationMap(): array
    {
        return DB::table('category_stations')->pluck('station_id', 'category_id')->all();
    }

    public function duplicate(Category $source): Category
    {
        return DB::transaction(function () use ($source) {
            $copy = $source->replicate(['slug']);
            $copy->name = $this->copyName($source->name);
            $copy->slug = null;
            if ($source->image_path && Storage::disk('public')->exists($source->image_path)) {
                $extension = pathinfo($source->image_path, PATHINFO_EXTENSION);
                $target = 'categories/'.Str::uuid().($extension ? ".{$extension}" : '');
                Storage::disk('public')->copy($source->image_path, $target);
                $copy->image_path = $target;
            }

            $copy->save();
            $this->insertCopyAfter($source, $copy);

            $stationId = DB::table('category_stations')->where('category_id', $source->id)->value('station_id');
            if ($stationId) {
                $this->syncStation($copy, (int) $stationId);
            }

            $this->menu->flush();

            return $copy;
        });
    }

    public function move(Category $category, int $delta): void
    {
        $ordered = Category::query()->orderBy('sort_order')->orderBy('id')->pluck('id')->all();
        $index = array_search($category->id, $ordered, true);

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
                Category::whereKey($id)->update(['sort_order' => $position]);
            }
        });

        $this->menu->flush();
    }

    /** @param  array<int, int>  $ids */
    public function bulk(string $action, array $ids): int
    {
        $query = Category::query()->whereIn('id', $ids);

        $count = match ($action) {
            'hide' => $query->update(['is_active' => false]),
            'show' => $query->update(['is_active' => true]),
            'delete' => $this->bulkDelete($query->get()),
            default => abort(422, 'Unknown bulk action.'),
        };

        $this->menu->flush();

        return (int) $count;
    }

    public function restore(int $categoryId): Category
    {
        $category = Category::onlyTrashed()->findOrFail($categoryId);
        $category->restore();
        $this->menu->flush();

        return $category;
    }

    /** @param  iterable<int, Category>  $categories */
    private function bulkDelete(iterable $categories): int
    {
        $deleted = 0;

        foreach ($categories as $category) {
            if ($category->products()->exists()) {
                throw ValidationException::withMessages([
                    'category' => "\"{$category->name}\" still has products. Move or delete them first.",
                ]);
            }

            $category->delete();
            $deleted++;
        }

        return $deleted;
    }

    private function copyName(string $name): string
    {
        $base = Str::endsWith($name, ' (copy)') ? $name : "{$name} (copy)";
        $candidate = $base;
        $i = 2;

        while (Category::withTrashed()->where('name', $candidate)->exists()) {
            $candidate = "{$base} {$i}";
            $i++;
        }

        return $candidate;
    }

    private function insertCopyAfter(Category $source, Category $copy): void
    {
        Category::query()
            ->whereKeyNot($copy->id)
            ->where('sort_order', '>', $source->sort_order)
            ->increment('sort_order');

        $copy->update(['sort_order' => $source->sort_order + 1]);
    }
}
