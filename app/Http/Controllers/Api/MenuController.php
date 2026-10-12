<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Menu\MenuService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    /**
     * GET /api/v1/menu
     * Active items only; sold-out items are hidden unless staff with
     * menu.availability ask for them (so the POS can toggle them back on).
     */
    public function index(Request $request, MenuService $menu): JsonResponse
    {
        $includeUnavailable = $request->boolean('include_unavailable')
            && (bool) $request->user()?->can('menu.availability');

        return response()->json([
            'data' => $menu->menu($includeUnavailable),
        ]);
    }
}
