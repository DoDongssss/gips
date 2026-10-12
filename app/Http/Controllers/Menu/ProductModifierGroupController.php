<?php

namespace App\Http\Controllers\Menu;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\Menu\MenuService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;

class ProductModifierGroupController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:menu.update')];
    }

    /** Attach modifier groups to a product, in the submitted order. */
    public function sync(Request $request, Product $product, MenuService $menu): RedirectResponse
    {
        $data = $request->validate([
            'group_ids' => ['present', 'array'],
            'group_ids.*' => ['integer', 'distinct', Rule::exists('modifier_groups', 'id')->whereNull('deleted_at')],
        ]);

        $product->modifierGroups()->sync(
            collect($data['group_ids'])->mapWithKeys(fn ($id, $i) => [$id => ['sort_order' => $i]])->all()
        );

        $menu->flush(); // pivot sync fires no model events

        return back()->with('success', 'Add-ons saved.');
    }
}
