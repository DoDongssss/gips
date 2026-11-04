<?php

namespace App\Http\Controllers\Menu;

use App\Http\Controllers\Controller;
use App\Http\Requests\Menu\ModifierGroupBulkRequest;
use App\Http\Requests\Menu\ModifierGroupRequest;
use App\Models\ModifierGroup;
use App\Services\Menu\MenuService;
use App\Services\Menu\ModifierGroupCatalogService;
use App\Services\Menu\ModifierGroupService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ModifierGroupController extends Controller implements HasMiddleware
{
    /** Columns the table may sort by (whitelist, never trust the query string). */
    private const SORTABLE = ['name', 'selection_type', 'products_count', 'is_active', 'sort_order'];

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

    public function index(Request $request, ModifierGroupCatalogService $catalog): Response
    {
        $search = trim((string) $request->query('search', ''));
        $status = in_array($request->query('status'), ['active', 'inactive'], true) ? $request->query('status') : null;
        $selection = in_array($request->query('selection'), ['single', 'multiple'], true) ? $request->query('selection') : null;
        $required = $request->query('required') === '1' ? true : ($request->query('required') === '0' ? false : null);
        $unused = $request->boolean('unused');
        $trashed = $request->boolean('trashed') && $request->user()->can('menu.delete');
        $sort = in_array($request->query('sort'), self::SORTABLE, true) ? $request->query('sort') : null;
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        return Inertia::render('menu/groups/index', [
            'groups' => Inertia::optional(function () use (
                $search, $status, $selection, $required, $unused, $trashed, $sort, $direction, $catalog
            ) {
                $query = ($trashed ? ModifierGroup::onlyTrashed() : ModifierGroup::query())
                    ->with('modifiers')
                    ->withCount('products')
                    ->when($search !== '', fn ($query) => $query->where(
                        fn ($q) => $q->where('name', 'like', "%{$search}%")
                            ->orWhereHas('modifiers', fn ($m) => $m->where('name', 'like', "%{$search}%")),
                    ))
                    ->when($status === 'active', fn ($q) => $q->where('is_active', true))
                    ->when($status === 'inactive', fn ($q) => $q->where('is_active', false))
                    ->when($selection, fn ($q, $type) => $q->where('selection_type', $type))
                    ->when($required === true, fn ($q) => $q->where('is_required', true))
                    ->when($required === false, fn ($q) => $q->where('is_required', false))
                    ->when($unused, fn ($q) => $q->whereDoesntHave('products'))
                    ->when(
                        $sort,
                        fn ($query) => $query->orderBy($sort, $direction)->orderBy('id'),
                        fn ($query) => $query->orderBy('sort_order')->orderBy('name'),
                    );

                $page = $query->paginate(self::PER_PAGE)->withQueryString();
                $modifierIds = $page->getCollection()->flatMap(fn (ModifierGroup $g) => $g->modifiers->pluck('id'))->all();
                $stockRules = $catalog->modifiersWithStockRules($modifierIds);

                return $page->through(fn (ModifierGroup $g) => [
                    'id' => $g->id,
                    'name' => $g->name,
                    'selection_type' => $g->selection_type->value,
                    'is_required' => $g->is_required,
                    'min_select' => $g->min_select,
                    'max_select' => $g->max_select,
                    'is_active' => $g->is_active,
                    'sort_order' => $g->sort_order,
                    'products_count' => $g->products_count,
                    'modifiers' => $g->modifiers->map(fn ($m) => [
                        'id' => $m->id,
                        'name' => $m->name,
                        'price_delta_cents' => $m->price_delta_cents,
                        'is_default' => $m->is_default,
                        'is_available' => $m->is_available,
                        'has_stock_rules' => isset($stockRules[$m->id]),
                    ])->values(),
                    'deleted_at' => $g->deleted_at?->toIso8601String(),
                ]);
            }),

            'filters' => [
                'search' => $search,
                'status' => $status,
                'selection' => $selection,
                'required' => $required === null ? null : ($required ? '1' : '0'),
                'unused' => $unused,
                'trashed' => $trashed,
                'sort' => $sort,
                'direction' => $sort ? $direction : null,
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $search = trim((string) $request->query('search', ''));

        $rows = ModifierGroup::query()
            ->with('modifiers')
            ->withCount('products')
            ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $filename = 'modifier-groups-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Group', 'Rule', 'Required', 'Min', 'Max', 'Visible', 'Products', 'Options']);

            foreach ($rows as $group) {
                $options = $group->modifiers->map(fn ($m) => $m->name.($m->price_delta_cents ? ' ('.$m->price_delta_cents.')' : ''))->join('; ');
                fputcsv($out, [
                    $group->name,
                    $group->selection_type->value,
                    $group->is_required ? 'yes' : 'no',
                    (string) $group->min_select,
                    $group->max_select === null ? '' : (string) $group->max_select,
                    $group->is_active ? 'yes' : 'no',
                    (string) $group->products_count,
                    $options,
                ]);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function store(ModifierGroupRequest $request, ModifierGroupService $service): RedirectResponse
    {
        $group = $service->save(null, $request->validated());

        return back()->with('success', "Group \"{$group->name}\" created.");
    }

    public function update(ModifierGroupRequest $request, ModifierGroup $group, ModifierGroupService $service): RedirectResponse
    {
        $service->save($group, $request->validated());

        return back()->with('success', "Group \"{$group->name}\" saved.");
    }

    public function destroy(ModifierGroup $group, MenuService $menu): RedirectResponse
    {
        $group->products()->detach();
        $group->delete();
        $menu->flush();

        return back()->with('success', "Group \"{$group->name}\" deleted.");
    }

    public function reorder(Request $request, MenuService $menu): RedirectResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:modifier_groups,id'],
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['ids'] as $position => $id) {
                ModifierGroup::whereKey($id)->update(['sort_order' => $position]);
            }
        });

        $menu->flush();

        return back()->with('success', 'Group order saved.');
    }

    public function move(ModifierGroup $group, Request $request, ModifierGroupCatalogService $catalog): RedirectResponse
    {
        $data = $request->validate(['direction' => ['required', 'in:up,down']]);
        $catalog->move($group, $data['direction'] === 'up' ? -1 : 1);

        return back()->with('success', 'Group order updated.');
    }

    public function duplicate(ModifierGroup $group, ModifierGroupCatalogService $catalog): RedirectResponse
    {
        $copy = $catalog->duplicate($group);

        return back()->with('success', "Group \"{$copy->name}\" created as a copy.");
    }

    public function bulk(ModifierGroupBulkRequest $request, ModifierGroupCatalogService $catalog): RedirectResponse
    {
        $data = $request->validated();

        if ($data['action'] === 'delete' && ! $request->user()->can('menu.delete')) {
            abort(403);
        }

        $count = $catalog->bulk($data['action'], $data['ids']);

        return back()->with('success', "Updated {$count} group(s).");
    }

    public function restore(int $group, ModifierGroupCatalogService $catalog): RedirectResponse
    {
        $model = $catalog->restore($group);

        return back()->with('success', "Group \"{$model->name}\" restored.");
    }
}
