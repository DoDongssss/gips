<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class RecipeRequest extends FormRequest
{
    use ChecksUnitConversion;

    public function authorize(): bool
    {
        return true;
    }

    /** A recipe with no items is deleted. A variant without its own recipe falls back to the product recipe. */
    public function rules(): array
    {
        return [
            'recipes' => ['required', 'array', 'max:50'],
            'recipes.*.product_variant_id' => ['nullable', 'integer'],
            'recipes.*.yield_quantity' => ['nullable', 'numeric', 'gt:0', 'max:999999'],
            'recipes.*.notes' => ['nullable', 'string', 'max:2000'],
            'recipes.*.items' => ['present', 'array', 'max:60'],
            'recipes.*.items.*.ingredient_id' => ['required', 'exists:ingredients,id'],
            'recipes.*.items.*.quantity' => ['required', 'numeric', 'gt:0', 'max:9999999999'],
            'recipes.*.items.*.unit_id' => ['required', 'exists:units,id'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $variantIds = $this->route('product')->variants()->pluck('id')->all();

            foreach ($this->input('recipes') as $r => $recipe) {
                $variantId = $recipe['product_variant_id'] ?? null;

                if ($variantId !== null && ! in_array((int) $variantId, $variantIds, true)) {
                    $validator->errors()->add("recipes.{$r}.product_variant_id", 'That size does not belong to this product.');
                }

                foreach ($recipe['items'] as $i => $item) {
                    if (! $this->convertsToBase($item['ingredient_id'], $item['unit_id'])) {
                        $validator->errors()->add("recipes.{$r}.items.{$i}.unit_id", 'This unit cannot be converted to the ingredient base unit.');
                    }
                }
            }
        }];
    }
}
