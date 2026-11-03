<?php

namespace Database\Seeders\Demo\Data;

/**
 * Demo modifier groups, their modifiers and the stock each modifier uses.
 *
 * Each modifier: [name, price delta in centavos, is default, stock effect].
 * Stock effect items are [action, ingredient, quantity in the ingredient's base unit, replaced ingredient|null]:
 *   add     uses extra stock
 *   remove  takes out up to this quantity of the recipe's ingredient
 *   replace takes out the replaced ingredient entirely and uses this one instead
 * Quantities are fixed, so "Oat milk" uses 180 ml on every size.
 */
final class ModifierCatalog
{
    /**
     * @return array<int, array{name: string, type: string, required: bool, min: int, max: int|null, modifiers: array<int, array>}>
     */
    public static function groups(): array
    {
        return [
            // ---- Drinks
            self::group('Milk', 'single', true, 1, 1, [
                ['Whole milk', 0, true, []],
                ['Oat milk', 4000, false, [self::replace('Oat milk', 180, 'Whole milk')]],
                ['Almond milk', 4000, false, [self::replace('Almond milk', 180, 'Whole milk')]],
            ]),
            self::group('Espresso Shots', 'single', false, 0, 1, [
                ['Extra shot', 4000, false, [self::add('Espresso beans', 18)]],
                ['Double extra shot', 7500, false, [self::add('Espresso beans', 36)]],
            ]),
            self::group('Syrup', 'multiple', false, 0, 2, [
                ['Vanilla syrup', 2500, false, [self::add('Vanilla syrup', 15)]],
                ['Caramel syrup', 2500, false, [self::add('Caramel syrup', 15)]],
                ['Hazelnut syrup', 2500, false, [self::add('Hazelnut syrup', 15)]],
                ['Brown sugar syrup', 2500, false, [self::add('Brown sugar syrup', 15)]],
            ]),
            self::group('Toppings', 'multiple', false, 0, 3, [
                ['Whipped cream', 2000, false, [self::add('Whipped cream', 30)]],
                ['Caramel drizzle', 2500, false, [self::add('Caramel syrup', 10)]],
                ['Chocolate drizzle', 2500, false, [self::add('Chocolate sauce', 10)]],
                ['Cookie crumble', 3000, false, [self::add('Cookie crumbs', 10)]],
            ]),
            self::group('Ice Level', 'single', false, 0, 1, [
                ['Regular ice', 0, true, []],
                ['Less ice', 0, false, [self::remove('Ice', 50)]],
                ['No ice', 0, false, [self::remove('Ice', 150)]],
            ]),
            self::group('Sugar Level', 'single', false, 0, 1, [
                ['100% sugar', 0, true, []],
                ['50% sugar', 0, false, [self::remove('Simple syrup', 10)]],
                ['No sugar', 0, false, [self::remove('Simple syrup', 30)]],
            ]),
            self::group('Tea Add-ons', 'multiple', false, 0, 2, [
                ['Honey', 2000, false, [self::add('Honey', 15)]],
                ['Lemon', 2000, false, [self::add('Lemon juice', 15)]],
            ]),

            // ---- Food
            self::group('Pastry Service', 'single', false, 0, 1, [
                ['Serve as is', 0, true, []],
                ['Warm up', 0, false, []],
            ]),
            self::group('Dessert Add-ons', 'multiple', false, 0, 2, [
                ['Scoop of ice cream', 4500, false, [self::add('Vanilla ice cream', 60)]],
                ['Chocolate topping', 2500, false, [self::add('Chocolate sauce', 10)]],
            ]),
            self::group('Sandwich Add-ons', 'multiple', false, 0, 3, [
                ['Extra cheese', 2000, false, [self::add('Cheese slice', 1)]],
                ['Add bacon', 3500, false, [self::add('Bacon strip', 2)]],
                ['Add egg', 2500, false, [self::add('Egg', 1)]],
            ]),
            self::group('Pasta Add-ons', 'multiple', false, 0, 3, [
                ['Extra parmesan', 2000, false, [self::add('Parmesan cheese', 15)]],
                ['Add grilled chicken', 4500, false, [self::add('Chicken breast', 80)]],
                ['Add bacon bits', 3500, false, [self::add('Bacon strip', 2)]],
            ]),
            self::group('Rice Type', 'single', true, 1, 1, [
                ['Plain rice', 0, true, []],
                ['Garlic rice', 2500, false, [self::add('Garlic', 8), self::add('Cooking oil', 6)]],
            ]),
            self::group('Meal Add-ons', 'multiple', false, 0, 3, [
                ['Extra rice', 2500, false, [self::add('Cooked rice', 150)]],
                ['Add fried egg', 2000, false, [self::add('Egg', 1), self::add('Cooking oil', 5)]],
            ]),
        ];
    }

    private static function group(string $name, string $type, bool $required, int $min, ?int $max, array $modifiers): array
    {
        return compact('name', 'type', 'required', 'min', 'max', 'modifiers');
    }

    private static function add(string $ingredient, int|float $qty): array
    {
        return ['add', $ingredient, $qty, null];
    }

    private static function remove(string $ingredient, int|float $qty): array
    {
        return ['remove', $ingredient, $qty, null];
    }

    private static function replace(string $with, int|float $qty, string $replaces): array
    {
        return ['replace', $with, $qty, $replaces];
    }
}
