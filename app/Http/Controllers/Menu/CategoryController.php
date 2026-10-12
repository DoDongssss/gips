<?php

namespace App\Http\Controllers\Menu;

use App\Http\Controllers\Controller;
use App\Http\Requests\Menu\CategoryRequest;
use App\Models\Category;
use App\Services\Menu\MenuService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:menu.view', only: ['index']),
            new Middleware('permission:menu.create', only: ['store']),
            new Middleware('permission:menu.update', only: ['update', 'reorder']),
            new Middleware('permission:menu.delete', only: ['destroy']),
        ];
    }

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $sort = in_array($request->query('sort'), ['name', 'products_count', 'is_active'], true) ? $request->query('sort') : null;
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';
 
        return Inertia::render('menu/categories/index', [
            // Optional: not queried on the first render. The page asks for it
            // with a partial reload (only: ['categories', 'filters']).
            'categories' => Inertia::optional(fn () => Category::query()
                ->withCount('products')
                ->when($search !== '', fn ($query) => $query->where(
                    fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('description', 'like', "%{$search}%"),
                ))
                ->when(
                    $sort,
                    fn ($query) => $query->orderBy($sort, $direction)->orderBy('id'),
                    fn ($query) => $query->ordered(),
                )
                ->paginate(10)
                ->withQueryString()
                ->through(fn (Category $c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'description' => $c->description,
                    'is_active' => $c->is_active,
                    'sort_order' => $c->sort_order,
                    'products_count' => $c->products_count,
                ])),
 
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $sort ? $direction : null,
            ],
        ]);
    }

    public function store(CategoryRequest $request): RedirectResponse
    {
        $category = Category::create([
            ...$request->validated(),
            'sort_order' => ((int) Category::withTrashed()->max('sort_order')) + 1,
        ]);

        return back()->with('success', "Category \"{$category->name}\" created.");
    }

    public function update(CategoryRequest $request, Category $category): RedirectResponse
    {
        $category->update($request->validated());

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

        $menu->flush(); // bulk updates do not fire model events

        return back()->with('success', 'Category order saved.');
    }
}
