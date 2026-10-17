<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\IngredientCategoryRequest;
use App\Models\IngredientCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class IngredientCategoryController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:inventory.adjust')];
    }

    public function store(IngredientCategoryRequest $request): RedirectResponse
    {
        $data = $request->validated();

        IngredientCategory::create(['name' => $data['name'], 'sort_order' => $data['sort_order'] ?? 0]);

        return back()->with('success', "{$data['name']} was added.");
    }

    public function update(IngredientCategoryRequest $request, IngredientCategory $category): RedirectResponse
    {
        $data = $request->validated();

        $category->update(['name' => $data['name'], 'sort_order' => $data['sort_order'] ?? $category->sort_order]);

        return back()->with('success', "{$category->name} was updated.");
    }

    /** Ingredients keep working; they just lose their category. */
    public function destroy(IngredientCategory $category): RedirectResponse
    {
        $category->ingredients()->update(['ingredient_category_id' => null]);
        $category->delete();

        return back()->with('success', 'Category deleted.');
    }
}
