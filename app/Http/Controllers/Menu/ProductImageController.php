<?php

namespace App\Http\Controllers\Menu;

use App\Http\Controllers\Controller;
use App\Http\Requests\Menu\StoreProductImageRequest;
use App\Models\Product;
use App\Models\ProductImage;
use App\Services\Menu\MenuService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProductImageController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:menu.update')];
    }

    public function store(StoreProductImageRequest $request, Product $product): RedirectResponse
    {
        $path = $request->file('image')->store('menu/products', 'public');

        $product->images()->create([
            'path' => $path,
            'alt' => $request->input('alt'),
            'is_primary' => ! $product->images()->exists(), // the first upload is primary
            'sort_order' => ((int) $product->images()->max('sort_order')) + 1,
        ]);

        return back()->with('success', 'Image uploaded.');
    }

    public function primary(Product $product, ProductImage $image, MenuService $menu): RedirectResponse
    {
        abort_unless($image->product_id === $product->id, 404);

        DB::transaction(function () use ($product, $image) {
            $product->images()->update(['is_primary' => false]);
            $image->update(['is_primary' => true]);
        });

        $menu->flush();

        return back()->with('success', 'Primary image updated.');
    }

    public function destroy(Product $product, ProductImage $image, MenuService $menu): RedirectResponse
    {
        abort_unless($image->product_id === $product->id, 404);

        DB::transaction(function () use ($product, $image) {
            $wasPrimary = $image->is_primary;

            Storage::disk('public')->delete($image->path);
            $image->delete();

            if ($wasPrimary) {
                $product->images()->first()?->update(['is_primary' => true]);
            }
        });

        $menu->flush();

        return back()->with('success', 'Image removed.');
    }
}
