<?php

namespace Database\Seeders\Demo\Data;

/**
 * Demo menu: 13 categories, 100 products. Prices are centavos.
 *
 * A product is described once and everything else is derived from it:
 *   - 'price'    the default size price (becomes the product's base price)
 *   - 'variants' [[size name, price, is default]], empty for single-size items
 *   - 'recipe'   ingredients for the default size (the product recipe), [[ingredient, quantity in base unit]]
 *   - 'sizes'    recipes for the other sizes, keyed by size name
 *   - 'groups'   modifier group names (see ModifierCatalog)
 *
 * Drinks are written as a core recipe (what goes in the cup). Cups, lids, straws and ice are added
 * per size by pack(), and the core is scaled for the other size by scale().
 */
final class MenuCatalog
{
    /** Fixed doses: a smaller cup still gets one full shot or scoop. */
    private const CONCENTRATES = ['Espresso beans', 'Matcha powder', 'Black tea leaves', 'Earl Grey tea leaves', 'Green tea leaves'];

    /**
     * @return array<int, array{name: string, station: string, description: string, products: array<int, array<string, mixed>>}>
     */
    public static function categories(): array
    {
        $latte = ['Milk', 'Espresso Shots', 'Syrup'];
        $icedLatte = ['Milk', 'Espresso Shots', 'Syrup', 'Ice Level'];
        $icedMocha = ['Milk', 'Espresso Shots', 'Syrup', 'Toppings', 'Ice Level'];
        $icedPlain = ['Milk', 'Ice Level'];
        $tea = ['Tea Add-ons', 'Sugar Level'];
        $icedTea = ['Tea Add-ons', 'Sugar Level', 'Ice Level'];
        $frappe = ['Milk', 'Toppings'];
        $coffeeFrappe = ['Milk', 'Espresso Shots', 'Toppings'];
        $refresher = ['Sugar Level', 'Ice Level'];
        $pastry = ['Pastry Service'];
        $dessert = ['Dessert Add-ons'];
        $sandwich = ['Sandwich Add-ons'];
        $pasta = ['Pasta Add-ons'];
        $rice = ['Rice Type', 'Meal Add-ons'];

        return [
            self::category('Hot Coffee', 'bar', 'HC', 'Espresso-based hot drinks.', [
                self::item('Espresso', 8000, [['Espresso beans', 18], ...self::pack('hot', 'small')], ['Espresso Shots'], 90),
                self::item('Doppio', 10000, [['Espresso beans', 36], ...self::pack('hot', 'small')], ['Espresso Shots'], 90),
                self::sized('hot', 'Hot Americano', 11000, 9500, [['Espresso beans', 18]], ['Espresso Shots', 'Syrup']),
                self::sized('hot', 'Cafe Latte', 13500, 12000, [['Espresso beans', 18], ['Whole milk', 200]], $latte),
                self::sized('hot', 'Cappuccino', 13500, 12000, [['Espresso beans', 18], ['Whole milk', 150]], $latte),
                self::sized('hot', 'Flat White', 14000, 12500, [['Espresso beans', 36], ['Whole milk', 150]], $latte),
                self::sized('hot', 'Cafe Mocha', 15000, 13500, [['Espresso beans', 18], ['Whole milk', 170], ['Chocolate sauce', 30]], [...$latte, 'Toppings']),
                self::sized('hot', 'Caramel Macchiato', 15500, 14000, [['Espresso beans', 18], ['Whole milk', 180], ['Vanilla syrup', 15], ['Caramel syrup', 15]], ['Milk', 'Espresso Shots', 'Toppings']),
                self::sized('hot', 'Spanish Latte', 15000, 13500, [['Espresso beans', 18], ['Whole milk', 150], ['Condensed milk', 30]], $latte),
                self::item('Cortado', 11000, [['Espresso beans', 36], ['Whole milk', 60], ...self::pack('hot', 'small')], ['Espresso Shots'], 120),
            ]),

            self::category('Iced Coffee', 'bar', 'IC', 'Cold espresso and cold brew drinks.', [
                self::sized('cold', 'Iced Americano', 11000, 13000, [['Espresso beans', 18]], ['Espresso Shots', 'Syrup', 'Ice Level']),
                self::sized('cold', 'Iced Latte', 12000, 14500, [['Espresso beans', 18], ['Whole milk', 180]], $icedLatte),
                self::sized('cold', 'Iced Mocha', 13500, 16000, [['Espresso beans', 18], ['Whole milk', 170], ['Chocolate sauce', 30]], $icedMocha),
                self::sized('cold', 'Iced Caramel Macchiato', 14500, 16500, [['Espresso beans', 18], ['Whole milk', 170], ['Vanilla syrup', 10], ['Caramel syrup', 20]], ['Milk', 'Espresso Shots', 'Toppings', 'Ice Level']),
                self::sized('cold', 'Iced Spanish Latte', 14000, 16500, [['Espresso beans', 18], ['Whole milk', 150], ['Condensed milk', 35]], $icedLatte),
                self::sized('cold', 'Iced Vanilla Latte', 13500, 16000, [['Espresso beans', 18], ['Whole milk', 180], ['Vanilla syrup', 20]], ['Milk', 'Espresso Shots', 'Ice Level']),
                self::sized('cold', 'Iced Hazelnut Latte', 13500, 16000, [['Espresso beans', 18], ['Whole milk', 180], ['Hazelnut syrup', 20]], ['Milk', 'Espresso Shots', 'Ice Level']),
                self::sized('cold', 'Iced Brown Sugar Latte', 14000, 16500, [['Espresso beans', 18], ['Whole milk', 180], ['Brown sugar syrup', 25]], ['Milk', 'Espresso Shots', 'Ice Level']),
                self::sized('cold', 'Cold Brew', 12500, 16000, [['Cold brew concentrate', 100]], ['Syrup', 'Ice Level']),
                self::sized('cold', 'Sweet Cream Cold Brew', 16500, 19000, [['Cold brew concentrate', 100], ['Whole milk', 40], ['Whipped cream', 20], ['Vanilla syrup', 10]], ['Ice Level']),
            ]),

            self::category('Blended', 'bar', 'BL', 'Frappes and blended drinks, topped on request.', [
                self::sized('blended', 'Mocha Frappe', 17000, 19500, [['Espresso beans', 18], ['Frappe base powder', 30], ['Whole milk', 120], ['Chocolate sauce', 35]], $coffeeFrappe, 240),
                self::sized('blended', 'Caramel Frappe', 17000, 19500, [['Espresso beans', 18], ['Frappe base powder', 30], ['Whole milk', 120], ['Caramel syrup', 35]], $coffeeFrappe, 240),
                self::sized('blended', 'Java Chip Frappe', 18000, 20500, [['Espresso beans', 18], ['Frappe base powder', 30], ['Whole milk', 120], ['Chocolate sauce', 25], ['Cookie crumbs', 15]], $coffeeFrappe, 240),
                self::sized('blended', 'Cookies & Cream Frappe', 17000, 19500, [['Frappe base powder', 40], ['Whole milk', 140], ['Cookie crumbs', 30]], $frappe, 240),
                self::sized('blended', 'Matcha Frappe', 18000, 20500, [['Matcha powder', 8], ['Frappe base powder', 30], ['Whole milk', 140], ['Simple syrup', 15]], $frappe, 240),
                self::sized('blended', 'Strawberry Cream Frappe', 17000, 19500, [['Frappe base powder', 40], ['Whole milk', 120], ['Strawberry puree', 50], ['Whipped cream', 20]], $frappe, 240),
                self::sized('blended', 'Mango Cream Frappe', 17000, 19500, [['Frappe base powder', 40], ['Whole milk', 120], ['Mango puree', 60], ['Whipped cream', 20]], $frappe, 240),
                self::sized('blended', 'Vanilla Cream Frappe', 16000, 18500, [['Frappe base powder', 40], ['Whole milk', 140], ['Vanilla syrup', 25]], $frappe, 240),
            ]),

            self::category('Tea', 'bar', 'TE', 'Brewed teas, chai and matcha.', [
                self::sized('hot', 'Hot Black Tea', 8500, 7000, [['Black tea leaves', 4], ['Simple syrup', 20]], $tea),
                self::sized('hot', 'Hot Earl Grey Tea', 8500, 7000, [['Earl Grey tea leaves', 4], ['Simple syrup', 20]], $tea),
                self::sized('hot', 'Hot Green Tea', 8500, 7000, [['Green tea leaves', 4], ['Simple syrup', 20]], $tea),
                self::sized('hot', 'Hot Chai Latte', 13000, 11500, [['Chai concentrate', 80], ['Whole milk', 150]], ['Milk', 'Syrup']),
                self::sized('hot', 'Hot Matcha Latte', 14500, 13000, [['Matcha powder', 6], ['Whole milk', 200], ['Simple syrup', 20]], ['Milk', 'Sugar Level', 'Syrup']),
                self::sized('cold', 'Iced Black Tea', 9500, 11500, [['Black tea leaves', 5], ['Simple syrup', 20]], $icedTea),
                self::sized('cold', 'Iced Lemon Tea', 10500, 12500, [['Black tea leaves', 5], ['Lemon juice', 25], ['Simple syrup', 25]], $icedTea),
                self::sized('cold', 'Iced Chai Latte', 14000, 16500, [['Chai concentrate', 90], ['Whole milk', 150]], ['Milk', 'Syrup', 'Ice Level']),
                self::sized('cold', 'Iced Matcha Latte', 14500, 16500, [['Matcha powder', 6], ['Whole milk', 200], ['Simple syrup', 20]], ['Milk', 'Sugar Level', 'Syrup', 'Ice Level']),
                self::sized('cold', 'Honey Green Tea', 11000, 13000, [['Green tea leaves', 5], ['Honey', 25], ['Simple syrup', 15]], $icedTea),
            ]),

            self::category('Non-Coffee', 'bar', 'NC', 'Milk, chocolate and matcha drinks without espresso.', [
                self::sized('hot', 'Hot Chocolate', 13000, 11500, [['Chocolate sauce', 40], ['Whole milk', 200]], $frappe),
                self::sized('cold', 'Iced Chocolate', 12500, 14500, [['Chocolate sauce', 40], ['Whole milk', 200]], ['Milk', 'Toppings', 'Ice Level']),
                self::sized('hot', 'Steamed Milk', 9000, 8000, [['Whole milk', 220]], ['Milk', 'Syrup']),
                self::sized('cold', 'Strawberry Milk', 12500, 14500, [['Strawberry puree', 50], ['Whole milk', 180]], $icedPlain),
                self::sized('cold', 'Iced Vanilla Milk', 11500, 13500, [['Vanilla syrup', 25], ['Whole milk', 200]], $icedPlain),
                self::sized('cold', 'Iced Dirty Matcha', 15500, 17500, [['Matcha powder', 6], ['Espresso beans', 18], ['Whole milk', 180], ['Simple syrup', 20]], ['Milk', 'Sugar Level', 'Ice Level']),
                self::sized('cold', 'Iced Strawberry Matcha', 15500, 17500, [['Matcha powder', 6], ['Strawberry puree', 40], ['Whole milk', 160]], $icedPlain),
                self::sized('hot', 'Hot Honey Lemon', 9500, 8500, [['Honey', 30], ['Lemon juice', 30]], ['Tea Add-ons']),
            ]),

            self::category('Refreshers', 'bar', 'RF', 'Lemonades and fruit sodas.', [
                self::sized('cold', 'Classic Lemonade', 9500, 11500, [['Lemon juice', 45], ['Simple syrup', 35]], $refresher),
                self::sized('cold', 'Strawberry Lemonade', 11500, 13500, [['Lemon juice', 40], ['Strawberry puree', 40], ['Simple syrup', 25]], $refresher),
                self::sized('cold', 'Mango Lemonade', 11500, 13500, [['Lemon juice', 40], ['Mango puree', 50], ['Simple syrup', 20]], $refresher),
                self::sized('cold', 'Blueberry Lemonade', 12000, 14000, [['Lemon juice', 40], ['Blueberry puree', 40], ['Simple syrup', 25]], $refresher),
                self::sized('cold', 'Strawberry Soda', 11000, 13000, [['Strawberry puree', 45], ['Simple syrup', 20], ['Soda water', 200]], $refresher),
                self::sized('cold', 'Mango Soda', 11000, 13000, [['Mango puree', 55], ['Simple syrup', 15], ['Soda water', 200]], $refresher),
                self::sized('cold', 'Blueberry Soda', 11500, 13500, [['Blueberry puree', 45], ['Simple syrup', 20], ['Soda water', 200]], $refresher),
                self::sized('cold', 'Honey Lemon Soda', 10500, 12500, [['Honey', 25], ['Lemon juice', 30], ['Soda water', 220]], ['Ice Level']),
            ]),

            self::category('Pastries', 'pastry', 'PA', 'Fresh bakes from the display case.', [
                self::item('Butter Croissant', 8500, [['Butter croissant', 1], ['Napkin', 1]], $pastry, 60),
                self::item('Chocolate Croissant', 9500, [['Chocolate croissant', 1], ['Napkin', 1]], $pastry, 60),
                self::item('Almond Croissant', 11500, [['Almond croissant', 1], ['Napkin', 1]], $pastry, 60),
                self::item('Blueberry Muffin', 9000, [['Blueberry muffin', 1], ['Napkin', 1]], $pastry, 60),
                self::item('Chocolate Muffin', 9500, [['Chocolate muffin', 1], ['Napkin', 1]], $pastry, 60),
                self::item('Cinnamon Roll', 9500, [['Cinnamon roll', 1], ['Napkin', 1]], $pastry, 60),
                self::item('Chocolate Chip Cookie', 6000, [['Chocolate chip cookie', 1], ['Napkin', 1]], $pastry, 30),
                self::item('Ensaymada', 7500, [['Ensaymada', 1], ['Napkin', 1]], $pastry, 60),
                self::item('Pandesal (3 pcs)', 6000, [['Pandesal', 3], ['Butter', 10], ['Napkin', 1]], $pastry, 90),
                self::item('Banana Loaf', 7000, [['Banana loaf slice', 1], ['Napkin', 1]], $pastry, 60),
            ]),

            self::category('Desserts', 'pastry', 'DS', 'Cake slices, cups and affogato.', [
                self::item('Cheesecake Slice', 15000, [['Cheesecake slice', 1], ['Napkin', 1]], $dessert, 60),
                self::item('Chocolate Cake Slice', 14500, [['Chocolate cake slice', 1], ['Napkin', 1]], $dessert, 60),
                self::item('Carrot Cake Slice', 14000, [['Carrot cake slice', 1], ['Napkin', 1]], $dessert, 60),
                self::item('Red Velvet Cake Slice', 15500, [['Red velvet cake slice', 1], ['Napkin', 1]], $dessert, 60),
                self::item('Tiramisu Cup', 16500, [['Tiramisu cup', 1], ['Napkin', 1]], $dessert, 60),
                self::item('Fudge Brownie', 9500, [['Fudge brownie', 1], ['Napkin', 1]], $dessert, 60),
                self::item('Brownie a la Mode', 14500, [['Fudge brownie', 1], ['Vanilla ice cream', 60], ['Chocolate sauce', 15], ['Napkin', 1]], [], 150),
                self::item('Affogato', 14500, [['Espresso beans', 18], ['Vanilla ice cream', 80], ['Hot cup 8oz', 1]], ['Espresso Shots'], 120),
            ]),

            self::category('Sandwiches & Wraps', 'kitchen', 'SW', 'Toasted sandwiches and wraps.', [
                self::item('Ham & Cheese Sandwich', 15500, [['Sandwich bread', 2], ['Ham slice', 2], ['Cheese slice', 1], ['Butter', 8], ['Napkin', 1]], $sandwich, 240),
                self::item('Tuna Melt', 16500, [['Sandwich bread', 2], ['Tuna flakes', 70], ['Mayonnaise', 15], ['Cheese slice', 2], ['Butter', 8], ['Napkin', 1]], $sandwich, 270),
                self::item('Club Sandwich', 18500, [['Sandwich bread', 3], ['Ham slice', 1], ['Bacon strip', 2], ['Egg', 1], ['Lettuce', 15], ['Tomato', 20], ['Mayonnaise', 15], ['Napkin', 1]], $sandwich, 300),
                self::item('Chicken Pesto Sandwich', 17500, [['Sandwich bread', 2], ['Chicken breast', 90], ['Pesto sauce', 20], ['Cheese slice', 1], ['Lettuce', 10], ['Napkin', 1]], $sandwich, 300),
                self::item('Grilled Cheese', 12500, [['Sandwich bread', 2], ['Cheese slice', 3], ['Butter', 10], ['Napkin', 1]], $sandwich, 210),
                self::item('BLT', 16500, [['Sandwich bread', 2], ['Bacon strip', 3], ['Lettuce', 20], ['Tomato', 25], ['Mayonnaise', 15], ['Napkin', 1]], $sandwich, 270),
                self::item('Chicken Caesar Wrap', 18000, [['Tortilla wrap', 1], ['Chicken breast', 90], ['Lettuce', 40], ['Parmesan cheese', 10], ['Mayonnaise', 20], ['Napkin', 1]], $sandwich, 300),
                self::item('Tuna Wrap', 16000, [['Tortilla wrap', 1], ['Tuna flakes', 70], ['Lettuce', 30], ['Tomato', 20], ['Mayonnaise', 15], ['Napkin', 1]], $sandwich, 240),
            ]),

            self::category('Pasta', 'kitchen', 'PS', 'Pasta plates cooked to order.', [
                self::item('Spaghetti Pomodoro', 15500, [['Pasta', 120], ['Tomato sauce', 120], ['Parmesan cheese', 8], ['Cooking oil', 10], ['Garlic', 5]], $pasta, 420),
                self::item('Creamy Carbonara', 17500, [['Pasta', 120], ['Cream sauce', 120], ['Bacon strip', 2], ['Parmesan cheese', 10], ['Cooking oil', 8]], $pasta, 420),
                self::item('Chicken Pesto Pasta', 18500, [['Pasta', 120], ['Pesto sauce', 40], ['Chicken breast', 90], ['Parmesan cheese', 8], ['Cooking oil', 10]], $pasta, 480),
                self::item('Aglio e Olio', 14500, [['Pasta', 120], ['Cooking oil', 25], ['Garlic', 12], ['Parmesan cheese', 5]], $pasta, 360),
                self::item('Chicken Alfredo', 18500, [['Pasta', 120], ['Cream sauce', 130], ['Chicken breast', 90], ['Parmesan cheese', 10], ['Cooking oil', 8]], $pasta, 480),
                self::item('Tuna Pasta', 16500, [['Pasta', 120], ['Tomato sauce', 100], ['Tuna flakes', 70], ['Cooking oil', 10], ['Garlic', 5]], $pasta, 420),
            ]),

            self::category('Rice Meals', 'kitchen', 'RM', 'Rice meals served with your choice of rice.', [
                self::item('Chicken Adobo Rice', 18500, [['Chicken adobo (cooked)', 180], ['Cooked rice', 200]], $rice, 360),
                self::item('Beef Tapa Rice', 20500, [['Beef tapa', 130], ['Cooked rice', 200], ['Egg', 1], ['Cooking oil', 10]], $rice, 420),
                self::item('Longganisa Rice', 17500, [['Pork longganisa', 3], ['Cooked rice', 200], ['Egg', 1], ['Cooking oil', 10]], $rice, 360),
                self::item('Bacon Silog', 17500, [['Bacon strip', 4], ['Cooked rice', 200], ['Egg', 1], ['Cooking oil', 10]], $rice, 360),
                self::item('Chicken Nuggets Rice', 15500, [['Chicken nuggets', 6], ['Cooked rice', 200], ['Cooking oil', 15]], $rice, 300),
                self::item('Tuna Rice Bowl', 15500, [['Tuna flakes', 90], ['Cooked rice', 200], ['Mayonnaise', 10], ['Lettuce', 20]], $rice, 240),
            ]),

            self::category('Breakfast', 'kitchen', 'BF', 'Egg plates and toast.', [
                self::item('Egg & Cheese Toast', 12000, [['Sandwich bread', 2], ['Egg', 1], ['Cheese slice', 1], ['Butter', 10], ['Napkin', 1]], $sandwich, 240),
                self::item('Ham & Cheese Omelette', 14500, [['Egg', 3], ['Ham slice', 2], ['Cheese slice', 1], ['Butter', 10], ['Cooking oil', 5], ['Sandwich bread', 2]], $sandwich, 300),
                self::item('Bacon & Egg Breakfast', 16500, [['Bacon strip', 3], ['Egg', 2], ['Sandwich bread', 2], ['Butter', 10], ['Cooking oil', 5]], $sandwich, 300),
            ]),

            self::category('Snacks & Sides', 'kitchen', 'SN', 'Shareable sides.', [
                self::item('French Fries', 9500, [['French fries', 150], ['Cooking oil', 15]], [], 240),
                self::item('Chicken Nuggets', 12500, [['Chicken nuggets', 6], ['Cooking oil', 15]], [], 240),
                self::item('Garlic Bread', 8500, [['Sandwich bread', 2], ['Butter', 15], ['Garlic', 5], ['Parmesan cheese', 5]], [], 180),
                self::item('Garden Salad', 11500, [['Lettuce', 80], ['Tomato', 40], ['Parmesan cheese', 5], ['Cooking oil', 5]], [], 120),
                self::item('Plain Rice', 3500, [['Cooked rice', 200]], [], 60),
            ]),
        ];
    }

    /** Wraps a category and gives each product a stable SKU (prefix + position). */
    private static function category(string $name, string $station, string $prefix, string $description, array $products): array
    {
        $products = array_map(
            fn (array $product, int $i) => $product + ['sku' => sprintf('%s-%03d', $prefix, $i + 1)],
            $products,
            array_keys($products),
        );

        return compact('name', 'station', 'description', 'products');
    }

    /** A single-size product with a fixed recipe. */
    private static function item(string $name, int $price, array $recipe, array $groups = [], int $prep = 180): array
    {
        return [
            'name' => $name, 'price' => $price, 'variants' => [], 'recipe' => $recipe,
            'sizes' => [], 'groups' => $groups, 'prep' => $prep,
        ];
    }

    /**
     * A drink in two sizes. Hot: Small 8oz and Regular 12oz (default). Cold and blended: Regular 16oz (default) and Large 22oz.
     * $other is the price of the non-default size.
     */
    private static function sized(string $kind, string $name, int $regular, int $other, array $core, array $groups = [], int $prep = 180): array
    {
        $hot = $kind === 'hot';

        return [
            'name' => $name,
            'price' => $regular,
            'variants' => $hot
                ? [['Small 8oz', $other, false], ['Regular 12oz', $regular, true]]
                : [['Regular 16oz', $regular, true], ['Large 22oz', $other, false]],
            'recipe' => [...$core, ...self::pack($kind, 'regular')],
            'sizes' => $hot
                ? ['Small 8oz' => [...self::scale($core, 0.7, 1.0), ...self::pack('hot', 'small')]]
                : ['Large 22oz' => [...self::scale($core, 1.35, 1.5), ...self::pack($kind, 'large')]],
            'groups' => $groups,
            'prep' => $prep,
        ];
    }

    /** Cup, lid, straw and ice for a drink kind and cup size. */
    private static function pack(string $kind, string $size): array
    {
        return match ("{$kind}.{$size}") {
            'hot.small' => [['Hot cup 8oz', 1], ['Hot lid', 1]],
            'hot.regular' => [['Hot cup 12oz', 1], ['Hot lid', 1], ['Cup sleeve', 1]],
            'cold.regular' => [['Ice', 120], ['Cold cup 16oz', 1], ['Cold lid', 1], ['Straw', 1]],
            'cold.large' => [['Ice', 160], ['Cold cup 22oz', 1], ['Cold lid', 1], ['Straw', 1]],
            'blended.regular' => [['Ice', 150], ['Cold cup 16oz', 1], ['Dome lid', 1], ['Straw', 1]],
            'blended.large' => [['Ice', 200], ['Cold cup 22oz', 1], ['Dome lid', 1], ['Straw', 1]],
        };
    }

    /** Scales a core recipe: $liquid applies to most items, $concentrate to shots, matcha and tea leaves. */
    private static function scale(array $core, float $liquid, float $concentrate): array
    {
        return array_map(function (array $row) use ($liquid, $concentrate) {
            [$name, $qty] = $row;

            $scaled = $qty * (in_array($name, self::CONCENTRATES, true) ? $concentrate : $liquid);

            return [$name, $scaled >= 20 ? (int) (round($scaled / 5) * 5) : max(1, (int) round($scaled))];
        }, $core);
    }
}
