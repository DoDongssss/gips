<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Menu\MenuService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MenuController extends Controller
{

    public function index(Request $request, MenuService $menu): JsonResponse
    {
        $includeUnavailable = $request->boolean('include_unavailable')
            && (bool) $request->user()?->can('menu.availability');

        return response()->json([
            'data' => $menu->menu($includeUnavailable),
        ]);
    }
}
