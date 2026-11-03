<?php

namespace App\Http\Controllers;

use App\Http\Requests\StationRequest;
use App\Models\Category;
use App\Models\Station;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/** Bar, kitchen and pastry stations, and which menu categories each one prepares. */
class StationController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:setting.view', only: ['index']),
            new Middleware('permission:setting.update', only: ['store', 'update']),
        ];
    }

    public function index(): Response
    {
        $assigned = DB::table('category_stations')->pluck('station_id', 'category_id');

        return Inertia::render('stations/index', [
            'stations' => Station::query()->ordered()->get()->map(fn (Station $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'type' => $s->type->value,
                'is_active' => $s->is_active,
                'sort_order' => $s->sort_order,
                'category_ids' => $assigned->filter(fn ($stationId) => $stationId === $s->id)->keys()->values(),
            ]),
            'categories' => Category::active()->ordered()->get(['id', 'name'])->map(fn (Category $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'station_id' => $assigned[$c->id] ?? null,
            ]),
        ]);
    }

    public function store(StationRequest $request): RedirectResponse
    {
        $station = $this->save(new Station, $request);

        return back()->with('success', "Station \"{$station->name}\" created.");
    }

    public function update(StationRequest $request, Station $station): RedirectResponse
    {
        $station = $this->save($station, $request);

        return back()->with('success', "Station \"{$station->name}\" saved.");
    }

    private function save(Station $station, StationRequest $request): Station
    {
        $data = $request->validated();

        return DB::transaction(function () use ($station, $data) {
            $station->fill([
                'name' => $data['name'],
                'type' => $data['type'],
                'is_active' => $data['is_active'],
                'sort_order' => $data['sort_order'] ?? 0,
            ])->save();

            $categoryIds = $data['category_ids'] ?? [];

            // One station per category: moving a category here takes it from its old station.
            DB::table('category_stations')->where('station_id', $station->id)->whereNotIn('category_id', $categoryIds)->delete();
            foreach ($categoryIds as $categoryId) {
                DB::table('category_stations')->updateOrInsert(
                    ['category_id' => $categoryId],
                    ['station_id' => $station->id, 'created_at' => now(), 'updated_at' => now()],
                );
            }

            return $station;
        });
    }
}
