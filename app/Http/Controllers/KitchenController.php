<?php

namespace App\Http\Controllers;

use App\Models\Station;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

/** Full-screen kitchen display pages. The data comes from the KDS JSON endpoints. */
class KitchenController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:kds.view')];
    }

    public function index(): Response
    {
        return Inertia::render('kitchen/index', [
            'stations' => Station::active()->ordered()->get(['id', 'name', 'type']),
        ]);
    }

    public function show(Station $station): Response
    {
        return Inertia::render('kitchen/show', [
            'station' => ['id' => $station->id, 'name' => $station->name, 'type' => $station->type->value],
        ]);
    }
}
