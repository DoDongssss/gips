<?php

namespace App\Http\Controllers\Menu;

use App\Http\Controllers\Controller;
use App\Http\Requests\Menu\ProductRequest;
use App\Models\Category;
use App\Models\ModifierGroup;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller implements HasMiddleware
{
    /** Columns the table may sort by (whitelist, never trust the query string). */
    private const SORTABLE = ['name', 'category_name', 'base_price_cents', 'is_available'];

    private const PER_PAGE = 15;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:menu.view', only: ['index']),
            new Middleware('permission:menu.create', only: ['store']),
            new Middleware('permission:menu.update', only: ['edit', 'update']),
            new Middleware('permission:menu.delete', only: ['destroy']),
        ];
    }

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $categoryId = $request->integer('category_id') ?: null;
        $status = in_array($request->query('status'), ['active', 'inactive', 'sold_out'], true) ? $request->query('status') : null;
        $sort = in_array($request->query('sort'), self::SORTABLE, true) ? $request->query('sort') : null;
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        // The product open in the edit dialog, if any (?edit=ID).
        // Only people who may update products can open it.
        $editing = $request->filled('edit') && $request->user()->can('menu.update')
            ? Product::query()->with(['variants', 'images', 'modifierGroups'])->find($request->integer('edit'))
            : null;

        return Inertia::render('menu/products/index', [
            // Optional: not queried on the first render. The page asks for it
            // with a partial reload (only: ['products', 'filters']).
            'products' => Inertia::optional(fn () => Product::query()
                ->with(['category:id,name', 'primaryImage'])
                ->withCount('variants')
                ->when($search !== '', fn ($q) => $q->where(
                    fn ($w) => $w->where('name', 'like', "%{$search}%")->orWhere('sku', 'like', "%{$search}%")
                ))
                ->when($categoryId, fn ($q, $id) => $q->where('category_id', $id))
                ->when($status, fn ($q, $s) => match ($s) {
                    'active' => $q->where('is_active', true),
                    'inactive' => $q->where('is_active', false),
                    'sold_out' => $q->where('is_available', false),
                    default => $q,
                })
                ->when($sort === 'category_name', fn ($q) => $q->orderBy(
                    Category::select('name')->whereColumn('categories.id', 'products.category_id'),
                    $direction,
                ))
                ->when($sort && $sort !== 'category_name', fn ($q) => $q->orderBy($sort, $direction))
                ->when(! $sort, fn ($q) => $q->orderBy('category_id')->ordered())
                ->orderBy('products.id')
                ->paginate(self::PER_PAGE)
                ->withQueryString()
                ->through(fn (Product $p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'sku' => $p->sku,
                    'category_id' => $p->category_id,
                    'category_name' => $p->category?->name,
                    'base_price_cents' => $p->base_price_cents,
                    'is_active' => $p->is_active,
                    'is_available' => $p->is_available,
                    'variants_count' => $p->variants_count,
                    'image_url' => $p->primaryImage?->url,
                ])),

            'categories' => Category::ordered()->get(['id', 'name']),

            // Only built while the dialog is open, so the normal list stays light.
            'editing' => $editing ? $this->detail($editing) : null,
            'modifierGroups' => $editing ? $this->attachableGroups() : [],

            'filters' => [
                'search' => $search,
                'category_id' => $categoryId ? (string) $categoryId : null,
                'status' => $status,
                'sort' => $sort,
                'direction' => $sort ? $direction : null,
            ],
        ]);
    }

    public function store(ProductRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $product = Product::create([
            ...$data,
            'sort_order' => ((int) Product::withTrashed()
                ->where('category_id', $data['category_id'])->max('sort_order')) + 1,
        ]);

        // Straight to the dialog in one redirect, so the success message is not lost.
        return to_route('menu.products.index', ['edit' => $product->id])
            ->with('success', "\"{$product->name}\" created. Add sizes, photos and add-ons below.");
    }

    // Old links to the edit page now open the dialog instead.
    public function edit(Product $product): RedirectResponse
    {
        session()->reflash();

        return to_route('menu.products.index', ['edit' => $product->id]);
    }

    public function update(ProductRequest $request, Product $product): RedirectResponse
    {
        $product->update($request->validated());

        return back()->with('success', "\"{$product->name}\" saved.");
    }

    public function destroy(Product $product): RedirectResponse
    {
        // Soft delete: order history keeps its snapshots. Images stay until a force delete.
        $product->delete();

        return to_route('menu.products.index')->with('success', "\"{$product->name}\" deleted.");
    }

    /** What the edit dialog reads (the ProductDetail type). */
    private function detail(Product $product): array
    {
        return [
            'id' => $product->id,
            'category_id' => $product->category_id,
            'name' => $product->name,
            'sku' => $product->sku,
            'description' => $product->description,
            'base_price_cents' => $product->base_price_cents,
            'is_taxable' => $product->is_taxable,
            'is_active' => $product->is_active,
            'is_available' => $product->is_available,
            'prep_time_seconds' => $product->prep_time_seconds,
            'variants' => $product->variants->map(fn ($v) => [
                'id' => $v->id,
                'name' => $v->name,
                'price_cents' => $v->price_cents,
                'is_default' => $v->is_default,
                'is_active' => $v->is_active,
            ])->values(),
            'images' => $product->images->map(fn ($i) => [
                'id' => $i->id,
                'url' => $i->url,
                'alt' => $i->alt,
                'is_primary' => $i->is_primary,
            ])->values(),
            'modifier_group_ids' => $product->modifierGroups->pluck('id')->values(),
        ];
    }

    /** Active modifier groups the product can be attached to (the AttachableGroup type). */
    private function attachableGroups()
    {
        return ModifierGroup::query()
            ->with('modifiers')
            ->where('is_active', true)
            ->orderBy('sort_order')->orderBy('name')
            ->get()
            ->map(fn (ModifierGroup $g) => [
                'id' => $g->id,
                'name' => $g->name,
                'selection_type' => $g->selection_type->value,
                'is_required' => $g->is_required,
                'options' => $g->modifiers->pluck('name')->values(),
            ]);
    }
}