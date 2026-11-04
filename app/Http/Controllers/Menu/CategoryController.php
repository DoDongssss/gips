<?php

namespace App\Http\Controllers\Menu;

use App\Http\Controllers\Controller;
use App\Http\Requests\Menu\CategoryBulkRequest;
use App\Http\Requests\Menu\CategoryRequest;
use App\Models\Category;
use App\Models\Station;
use App\Services\Menu\CategoryCatalogService;
use App\Services\Menu\MenuService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CategoryController extends Controller implements HasMiddleware
{
    private const PER_PAGE = 25;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:menu.view', only: ['index', 'export']),
            new Middleware('permission:menu.create', only: ['store', 'duplicate']),
            new Middleware('permission:menu.update', only: ['update', 'reorder', 'move', 'bulk', 'restore']),
            new Middleware('permission:menu.delete', only: ['destroy']),
        ];
    }

    public function index(Request $request, CategoryCatalogService $catalog): Response
    {
        $search = trim((string) $request->query('search', ''));
        $status = in_array($request->query('status'), ['active', 'inactive'], true) ? $request->query('status') : null;
        $trashed = $request->boolean('trashed') && $request->user()->can('menu.delete');
        $sort = in_array($request->query('sort'), ['name', 'products_count', 'is_active', 'sort_order'], true) ? $request->query('sort') : null;
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        $stations = Station::query()->ordered()->get(['id', 'name'])->keyBy('id');
        $stationMap = $catalog->stationMap();

        return Inertia::render('menu/categories/index', [
            'categories' => Inertia::optional(function () use ($search, $status, $trashed, $sort, $direction, $stations, $stationMap) {
                $query = ($trashed ? Category::onlyTrashed() : Category::query())
                    ->withCount('products')
                    ->when($search !== '', fn ($query) => $query->where(
                        fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('description', 'like', "%{$search}%"),
                    ))
                    ->when($status === 'active', fn ($q) => $q->where('is_active', true))
                    ->when($status === 'inactive', fn ($q) => $q->where('is_active', false))
                    ->when(
                        $sort,
                        fn ($query) => $query->orderBy($sort, $direction)->orderBy('id'),
                        fn ($query) => $query->ordered(),
                    );

                return $query->paginate(self::PER_PAGE)->withQueryString()->through(function (Category $c) use ($stations, $stationMap) {
                    $stationId = $stationMap[$c->id] ?? null;

                    return [
                        'id' => $c->id,
                        'name' => $c->name,
                        'slug' => $c->slug,
                        'description' => $c->description,
                        'is_active' => $c->is_active,
                        'sort_order' => $c->sort_order,
                        'products_count' => $c->products_count,
                        'station_id' => $stationId,
                        'station_name' => $stationId ? ($stations[$stationId]->name ?? null) : null,
                        'image_url' => $c->image_url,
                        'deleted_at' => $c->deleted_at?->toIso8601String(),
                    ];
                });
            }),

            'stations' => Station::query()->ordered()->get(['id', 'name']),

            'filters' => [
                'search' => $search,
                'status' => $status,
                'trashed' => $trashed,
                'sort' => $sort,
                'direction' => $sort ? $direction : null,
            ],
        ]);
    }

    public function export(Request $request, CategoryCatalogService $catalog): StreamedResponse
    {
        $search = trim((string) $request->query('search', ''));
        $status = in_array($request->query('status'), ['active', 'inactive'], true) ? $request->query('status') : null;
        $stations = Station::query()->pluck('name', 'id');
        $stationMap = $catalog->stationMap();

        $rows = Category::query()
            ->withCount('products')
            ->when($search !== '', fn ($query) => $query->where(
                fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('description', 'like', "%{$search}%"),
            ))
            ->when($status === 'active', fn ($q) => $q->where('is_active', true))
            ->when($status === 'inactive', fn ($q) => $q->where('is_active', false))
            ->ordered()
            ->get();

        $filename = 'menu-categories-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($rows, $stations, $stationMap) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Name', 'Description', 'Products', 'Visible', 'Sort order', 'Kitchen station']);

            foreach ($rows as $category) {
                $stationId = $stationMap[$category->id] ?? null;
                fputcsv($out, [
                    $category->name,
                    $category->description ?? '',
                    (string) $category->products_count,
                    $category->is_active ? 'yes' : 'no',
                    (string) $category->sort_order,
                    $stationId ? ($stations[$stationId] ?? '') : '',
                ]);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function store(CategoryRequest $request, CategoryCatalogService $catalog): RedirectResponse
    {
        $category = Category::create([
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
            'is_active' => $request->boolean('is_active'),
            'sort_order' => ((int) Category::withTrashed()->max('sort_order')) + 1,
        ]);

        $this->saveImage($request, $category);
        $catalog->syncStation($category, $request->validated('station_id'));

        return back()->with('success', "Category \"{$category->name}\" created.");
    }

    public function update(CategoryRequest $request, Category $category, CategoryCatalogService $catalog): RedirectResponse
    {
        $category->update([
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
            'is_active' => $request->boolean('is_active'),
        ]);

        $this->saveImage($request, $category);
        $catalog->syncStation($category, $request->validated('station_id'));

        return back()->with('success', "Category \"{$category->name}\" updated.");
    }

    public function destroy(Category $category): RedirectResponse
    {
        if ($category->products()->exists()) {
            throw ValidationException::withMessages([
                'category' => "\"{$category->name}\" still has products. Move or delete them first.",
            ]);
        }

        $category->delete();

        return back()->with('success', "Category \"{$category->name}\" deleted.");
    }

    public function reorder(Request $request, MenuService $menu): RedirectResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:categories,id'],
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['ids'] as $position => $id) {
                Category::whereKey($id)->update(['sort_order' => $position]);
            }
        });

        $menu->flush();

        return back()->with('success', 'Category order saved.');
    }

    public function move(Category $category, Request $request, CategoryCatalogService $catalog): RedirectResponse
    {
        $data = $request->validate(['direction' => ['required', 'in:up,down']]);
        $catalog->move($category, $data['direction'] === 'up' ? -1 : 1);

        return back()->with('success', 'Category order updated.');
    }

    public function duplicate(Category $category, CategoryCatalogService $catalog): RedirectResponse
    {
        $copy = $catalog->duplicate($category);

        return back()->with('success', "Category \"{$copy->name}\" created as a copy.");
    }

    public function bulk(CategoryBulkRequest $request, CategoryCatalogService $catalog): RedirectResponse
    {
        $data = $request->validated();

        if ($data['action'] === 'delete' && ! $request->user()->can('menu.delete')) {
            abort(403);
        }

        $count = $catalog->bulk($data['action'], $data['ids']);

        return back()->with('success', "Updated {$count} category(ies).");
    }

    public function restore(int $category, CategoryCatalogService $catalog): RedirectResponse
    {
        $model = $catalog->restore($category);

        return back()->with('success', "Category \"{$model->name}\" restored.");
    }

    private function saveImage(CategoryRequest $request, Category $category): void
    {
        if ($request->boolean('remove_image') && $category->image_path) {
            Storage::disk('public')->delete($category->image_path);
            $category->update(['image_path' => null]);
        }

        if ($request->hasFile('image')) {
            if ($category->image_path) {
                Storage::disk('public')->delete($category->image_path);
            }

            $category->update(['image_path' => $request->file('image')->store('categories', 'public')]);
        }
    }
}
