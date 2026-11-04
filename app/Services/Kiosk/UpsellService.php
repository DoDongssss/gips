<?php

namespace App\Services\Kiosk;

use App\Services\Menu\MenuService;
use Illuminate\Support\Facades\DB;

class UpsellService
{
    public function __construct(private MenuService $menu) {}

    /**
     * "Add a pastry?" suggestions for the current cart. A rule fires when the cart holds its trigger product
     * or any product from its trigger category. Higher priority first, never something already in the cart,
     * only products that are active and not sold out. At most $limit suggestions.
     *
     * @param  array<int, int>  $productIds  product ids in the cart
     * @return array<int, array{product_id:int, message:?string, product:array<string, mixed>|null}>
     */
    public function suggest(array $productIds, int $limit = 3): array
    {
        $productIds = array_values(array_unique(array_map('intval', $productIds)));

        if ($productIds === []) {
            return [];
        }

        $categoryIds = array_values(array_filter(
            DB::table('products')->whereIn('id', $productIds)->pluck('category_id')->unique()->all(),
            fn ($id) => $id !== null,
        ));

        $rules = DB::table('upsell_rules as r')
            ->join('products as p', 'p.id', '=', 'r.suggested_product_id')
            ->where('r.is_active', true)->whereIn('r.channel', ['all', 'kiosk'])
            ->where('p.is_active', true)->where('p.is_available', true)->whereNull('p.deleted_at')
            ->whereNotIn('r.suggested_product_id', $productIds)
            ->where(function ($q) use ($productIds, $categoryIds) {
                $q->whereIn('r.trigger_product_id', $productIds);
                if ($categoryIds !== []) {
                    $q->orWhereIn('r.trigger_category_id', $categoryIds);
                }
            })
            ->orderByDesc('r.priority')->orderBy('r.id')
            ->get(['r.suggested_product_id', 'r.message']);

        $menuById = collect($this->menu->menu(false))
            ->flatMap(fn (array $category) => $category['products'])
            ->keyBy('id');

        $out = [];
        foreach ($rules as $rule) {
            $productId = (int) $rule->suggested_product_id;

            if (isset($out[$productId])) {
                continue;
            }

            $product = $menuById->get($productId);
            if ($product === null) {
                continue;
            }

            $out[$productId] = [
                'product_id' => $productId,
                'message' => $rule->message,
                'product' => $product,
            ];

            if (count($out) >= $limit) {
                break;
            }
        }

        return array_values($out);
    }
}
