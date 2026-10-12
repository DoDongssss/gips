<?php

namespace App\Http\Controllers\Menu;

use App\Http\Controllers\Controller;
use App\Models\Modifier;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * One-click sold-out toggle. Uses its own permission (menu.availability)
 * so a cashier can toggle availability without being able to edit prices.
 * Serves both the Inertia pages (redirect + flash) and the POS (JSON).
 */
class AvailabilityController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:menu.availability')];
    }

    public function product(Request $request, Product $product): RedirectResponse|JsonResponse
    {
        $data = $request->validate(['is_available' => ['required', 'boolean']]);

        $product->update(['is_available' => $data['is_available']]);

        return $this->respond($request, $product->id, $product->is_available, $product->name);
    }

    public function modifier(Request $request, Modifier $modifier): RedirectResponse|JsonResponse
    {
        $data = $request->validate(['is_available' => ['required', 'boolean']]);

        $modifier->update(['is_available' => $data['is_available']]);

        return $this->respond($request, $modifier->id, $modifier->is_available, $modifier->name);
    }

    private function respond(Request $request, int $id, bool $available, string $name): RedirectResponse|JsonResponse
    {
        if ($request->expectsJson()) {
            return response()->json(['id' => $id, 'is_available' => $available]);
        }

        return back()->with('success', $available ? "{$name} is available again." : "{$name} marked as sold out.");
    }
}
