<?php

namespace App\Http\Controllers\Menu;

use App\Http\Controllers\Controller;
use App\Http\Requests\Menu\SyncVariantsRequest;
use App\Models\Product;
use App\Services\Menu\VariantService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class ProductVariantController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:menu.update')];
    }

    public function sync(SyncVariantsRequest $request, Product $product, VariantService $variants): RedirectResponse
    {
        $variants->sync($product, $request->validated()['variants']);

        return back()->with('success', 'Sizes saved.');
    }
}
