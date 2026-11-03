<?php

namespace App\Http\Controllers\Menu;

use App\Http\Controllers\Controller;
use App\Http\Requests\Menu\ModifierGroupRequest;
use App\Models\ModifierGroup;
use App\Services\Menu\MenuService;
use App\Services\Menu\ModifierGroupService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ModifierGroupController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:menu.view', only: ['index']),
            new Middleware('permission:menu.create', only: ['store']),
            new Middleware('permission:menu.update', only: ['update']),
            new Middleware('permission:menu.delete', only: ['destroy']),
        ];
    }

    /** Columns the table may sort by (whitelist, never trust the query string). */
    private const SORTABLE = ['name', 'selection_type', 'products_count', 'is_active'];
 
    private const PER_PAGE = 10;
 
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $sort = in_array($request->query('sort'), self::SORTABLE, true) ? $request->query('sort') : null;
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';
 
        return Inertia::render('menu/groups/index', [
            // Optional: not queried on the first render. The page asks for it
            // with a partial reload (only: ['groups', 'filters']).
            'groups' => Inertia::optional(fn () => ModifierGroup::query()
                ->with('modifiers')
                ->withCount('products')
                ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
                ->when(
                    $sort,
                    fn ($query) => $query->orderBy($sort, $direction)->orderBy('id'),
                    fn ($query) => $query->orderBy('sort_order')->orderBy('name'),
                )
                ->paginate(self::PER_PAGE)
                ->withQueryString()
                ->through(fn (ModifierGroup $g) => [
                    'id' => $g->id,
                    'name' => $g->name,
                    'selection_type' => $g->selection_type->value,
                    'is_required' => $g->is_required,
                    'min_select' => $g->min_select,
                    'max_select' => $g->max_select,
                    'is_active' => $g->is_active,
                    'products_count' => $g->products_count,
                    'modifiers' => $g->modifiers->map(fn ($m) => [
                        'id' => $m->id,
                        'name' => $m->name,
                        'price_delta_cents' => $m->price_delta_cents,
                        'is_default' => $m->is_default,
                        'is_available' => $m->is_available,
                    ])->values(),
                ])),
 
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $sort ? $direction : null,
            ],
        ]);
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
}
