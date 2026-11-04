<?php

namespace App\Http\Controllers\Menu;

use App\Http\Controllers\Controller;
use App\Http\Requests\Menu\ProductBulkRequest;
use App\Http\Requests\Menu\ProductReorderRequest;
use App\Http\Requests\Menu\ProductRequest;
use App\Models\Category;
use App\Models\ModifierGroup;
use App\Models\Product;
use App\Models\Station;
use App\Services\Menu\ProductCatalogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductController extends Controller implements HasMiddleware
{
    /** Columns the table may sort by (whitelist, never trust the query string). */
    private const SORTABLE = ['name', 'category_name', 'base_price_cents', 'is_available', 'sort_order'];

    private const PER_PAGE = 25;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:menu.view', only: ['index', 'export']),
            new Middleware('permission:menu.create', only: ['store', 'duplicate']),
            new Middleware('permission:menu.update', only: ['edit', 'update', 'reorder', 'move', 'bulk', 'restore']),
            new Middleware('permission:menu.delete', only: ['destroy']),
        ];
    }

    public function index(Request $request, ProductCatalogService $catalog): Response
    {
        $search = trim((string) $request->query('search', ''));
        $categoryId = $request->integer('category_id') ?: null;
        $stationId = $request->query('station_id');
        $stationFilter = $stationId === 'category' ? 'category' : ($request->integer('station_id') ?: null);
        $status = in_array($request->query('status'), ['active', 'inactive', 'sold_out'], true) ? $request->query('status') : null;
        $recipe = in_array($request->query('recipe'), ['no_recipe', 'has_recipe'], true) ? $request->query('recipe') : null;
        $hasImage = $request->query('has_image') === '1' ? true : ($request->query('has_image') === '0' ? false : null);
        $modifierGroupId = $request->integer('modifier_group') ?: null;
        $trashed = $request->boolean('trashed') && $request->user()->can('menu.delete');
        $sort = in_array($request->query('sort'), self::SORTABLE, true) ? $request->query('sort') : null;
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        $editing = $request->filled('edit') && $request->user()->can('menu.update')
            ? Product::query()->with(['variants', 'images', 'modifierGroups'])->find($request->integer('edit'))
            : null;

        return Inertia::render('menu/products/index', [
            'products' => Inertia::optional(function () use (
                $search, $categoryId, $stationFilter, $status, $recipe, $hasImage, $modifierGroupId, $trashed, $sort, $direction, $catalog
            ) {
                $query = ($trashed ? Product::onlyTrashed() : Product::query())
                    ->with(['category:id,name', 'primaryImage', 'station:id,name'])
                    ->withCount(['variants', 'modifierGroups'])
                    ->withMin(['variants as min_variant_price_cents' => fn ($q) => $q->where('is_active', true)], 'price_cents')
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
                    ->when($stationFilter === 'category', fn ($q) => $q->whereNull('station_id'))
                    ->when(is_int($stationFilter), fn ($q) => $q->where('station_id', $stationFilter))
                    ->when($recipe === 'no_recipe', fn ($q) => $q->whereDoesntHave('recipes', fn ($r) => $r->whereHas('items')))
                    ->when($recipe === 'has_recipe', fn ($q) => $q->whereHas('recipes', fn ($r) => $r->whereHas('items')))
                    ->when($hasImage === true, fn ($q) => $q->whereHas('images'))
                    ->when($hasImage === false, fn ($q) => $q->whereDoesntHave('images'))
                    ->when($modifierGroupId, fn ($q, $id) => $q->whereHas('modifierGroups', fn ($g) => $g->where('modifier_groups.id', $id)))
                    ->when($sort === 'category_name', fn ($q) => $q->orderBy(
                        Category::select('name')->whereColumn('categories.id', 'products.category_id'),
                        $direction,
                    ))
                    ->when($sort && $sort !== 'category_name', fn ($q) => $q->orderBy($sort, $direction))
                    ->when(! $sort, fn ($q) => $q->orderBy('category_id')->orderBy('sort_order')->ordered())
                    ->orderBy('products.id');

                $page = $query->paginate(self::PER_PAGE)->withQueryString();
                $statuses = $catalog->recipeStatuses($page->getCollection());

                return $page->through(function (Product $p) use ($statuses) {
                    $minVariant = $p->min_variant_price_cents !== null ? (int) $p->min_variant_price_cents : null;

                    return [
                        'id' => $p->id,
                        'name' => $p->name,
                        'sku' => $p->sku,
                        'category_id' => $p->category_id,
                        'category_name' => $p->category?->name,
                        'base_price_cents' => $p->base_price_cents,
                        'min_price_cents' => $p->variants_count > 0 ? $minVariant : $p->base_price_cents,
                        'is_active' => $p->is_active,
                        'is_available' => $p->is_available,
                        'variants_count' => $p->variants_count,
                        'modifier_groups_count' => $p->modifier_groups_count,
                        'image_url' => $p->primaryImage?->url,
                        'has_image' => $p->primaryImage !== null,
                        'station_label' => $p->station?->name ?? 'Category default',
                        'recipe_status' => $statuses[$p->id] ?? 'none',
                        'sort_order' => $p->sort_order,
                        'deleted_at' => $p->deleted_at?->toIso8601String(),
                    ];
                });
            }),

            'categories' => Category::ordered()->get(['id', 'name']),
            'modifierGroupOptions' => ModifierGroup::query()->orderBy('sort_order')->orderBy('name')->get(['id', 'name']),
            'stations' => Station::active()->ordered()->get(['id', 'name']),

            'editing' => $editing ? $this->detail($editing, $catalog) : null,
            'modifierGroups' => $editing ? $this->attachableGroups() : [],
            'dialogStations' => $editing ? Station::active()->ordered()->get(['id', 'name']) : [],

            'filters' => [
                'search' => $search,
                'category_id' => $categoryId ? (string) $categoryId : null,
                'station_id' => $stationFilter === 'category' ? 'category' : ($stationFilter ? (string) $stationFilter : null),
                'status' => $status,
                'recipe' => $recipe,
                'has_image' => $hasImage === null ? null : ($hasImage ? '1' : '0'),
                'modifier_group' => $modifierGroupId ? (string) $modifierGroupId : null,
                'trashed' => $trashed,
                'sort' => $sort,
                'direction' => $sort ? $direction : null,
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $search = trim((string) $request->query('search', ''));
        $categoryId = $request->integer('category_id') ?: null;
        $status = in_array($request->query('status'), ['active', 'inactive', 'sold_out'], true) ? $request->query('status') : null;

        $rows = Product::query()
            ->with(['category:id,name'])
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
            ->orderBy('category_id')->orderBy('sort_order')->ordered()
            ->get();

        $filename = 'menu-products-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Name', 'SKU', 'Category', 'Base price', 'Sizes', 'Taxable', 'Active', 'Available']);

            foreach ($rows as $product) {
                fputcsv($out, [
                    $product->name,
                    $product->sku ?? '',
                    $product->category?->name ?? '',
                    number_format($product->base_price_cents / 100, 2, '.', ''),
                    (string) $product->variants_count,
                    $product->is_taxable ? 'yes' : 'no',
                    $product->is_active ? 'yes' : 'no',
                    $product->is_available ? 'yes' : 'no',
                ]);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function store(ProductRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $product = Product::create([
            ...$data,
            'sort_order' => ((int) Product::withTrashed()
                ->where('category_id', $data['category_id'])->max('sort_order')) + 1,
        ]);

        return to_route('menu.products.index', ['edit' => $product->id])
            ->with('success', "\"{$product->name}\" created. Add sizes, photos and add-ons below.");
    }

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
        $product->delete();

        return to_route('menu.products.index')->with('success', "\"{$product->name}\" deleted.");
    }

    public function duplicate(Product $product, ProductCatalogService $catalog): RedirectResponse
    {
        $copy = $catalog->duplicate($product);

        return to_route('menu.products.index', ['edit' => $copy->id])
            ->with('success', "\"{$copy->name}\" created as a copy.");
    }

    public function reorder(ProductReorderRequest $request, ProductCatalogService $catalog): RedirectResponse
    {
        $data = $request->validated();
        $catalog->reorderInCategory((int) $data['category_id'], $data['ids']);

        return back()->with('success', 'Product order saved.');
    }

    public function move(Request $request, Product $product, ProductCatalogService $catalog): RedirectResponse
    {
        $data = $request->validate(['direction' => ['required', 'in:up,down']]);
        $catalog->move($product, $data['direction'] === 'up' ? -1 : 1);

        return back()->with('success', 'Product order updated.');
    }

    public function bulk(ProductBulkRequest $request, ProductCatalogService $catalog): RedirectResponse
    {
        $data = $request->validated();

        if ($data['action'] === 'delete' && ! $request->user()->can('menu.delete')) {
            abort(403);
        }

        $extra = isset($data['category_id']) ? ['category_id' => $data['category_id']] : [];
        $count = $catalog->bulk($data['action'], $data['ids'], $extra);

        return back()->with('success', "Updated {$count} product(s).");
    }

    public function restore(int $product, ProductCatalogService $catalog): RedirectResponse
    {
        $model = $catalog->restore($product);

        return back()->with('success', "\"{$model->name}\" restored.");
    }

    /** What the edit dialog reads (the ProductDetail type). */
    private function detail(Product $product, ProductCatalogService $catalog): array
    {
        return [
            'id' => $product->id,
            'category_id' => $product->category_id,
            'station_id' => $product->station_id,
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
            'margin_preview' => $catalog->marginPreview($product),
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
