<?php

namespace Database\Seeders\Demo\Data;

/**
 * Demo ingredients and the suppliers that stock them.
 *
 * Costs are centavos PER BASE UNIT (1200 pesos/kg of beans = 120 centavos per gram).
 * Supplier prices are derived from these costs, so the two can never drift apart.
 */
final class IngredientCatalog
{
    /**
     * name => [category, base unit, purchase unit, reorder level, cost per base unit (centavos), opening stock (base units)]
     *
     * @return array<string, array{0: string, 1: string, 2: string, 3: int|float, 4: int|float, 5: int|float}>
     */
    public static function ingredients(): array
    {
        return [
            // Coffee
            'Espresso beans'        => ['Coffee', 'g', 'kg', 3000, 120, 15000],
            'Cold brew concentrate' => ['Coffee', 'ml', 'l', 2000, 45, 10000],

            // Tea
            'Black tea leaves'      => ['Tea', 'g', 'kg', 300, 80, 1500],
            'Earl Grey tea leaves'  => ['Tea', 'g', 'kg', 300, 90, 1500],
            'Green tea leaves'      => ['Tea', 'g', 'kg', 300, 85, 1500],
            'Matcha powder'         => ['Tea', 'g', 'kg', 400, 240, 2500],
            'Chai concentrate'      => ['Tea', 'ml', 'l', 1000, 35, 5000],

            // Dairy
            'Whole milk'            => ['Dairy', 'ml', 'l', 8000, 9.5, 40000],
            'Oat milk'              => ['Dairy', 'ml', 'l', 3000, 22, 12000],
            'Almond milk'           => ['Dairy', 'ml', 'l', 3000, 24, 12000],
            'Condensed milk'        => ['Dairy', 'ml', 'l', 2000, 14, 8000],
            'Whipped cream'         => ['Dairy', 'ml', 'l', 1500, 38, 6000],
            'Butter'                => ['Dairy', 'g', 'kg', 1000, 45, 4000],
            'Parmesan cheese'       => ['Dairy', 'g', 'kg', 300, 90, 2000],
            'Cheese slice'          => ['Dairy', 'pc', 'pc', 20, 700, 100],

            // Syrups & Bases
            'Chocolate sauce'       => ['Syrups & Bases', 'ml', 'l', 1000, 40, 6000],
            'Caramel syrup'         => ['Syrups & Bases', 'ml', 'l', 1000, 45, 6000],
            'Vanilla syrup'         => ['Syrups & Bases', 'ml', 'l', 1000, 45, 5000],
            'Hazelnut syrup'        => ['Syrups & Bases', 'ml', 'l', 1000, 45, 5000],
            'Brown sugar syrup'     => ['Syrups & Bases', 'ml', 'l', 1000, 30, 5000],
            'Simple syrup'          => ['Syrups & Bases', 'ml', 'l', 1500, 8, 8000],
            'Honey'                 => ['Syrups & Bases', 'ml', 'l', 500, 60, 3000],
            'Frappe base powder'    => ['Syrups & Bases', 'g', 'kg', 1500, 60, 8000],
            'Cookie crumbs'         => ['Syrups & Bases', 'g', 'kg', 500, 50, 3000],

            // Fruit & Juice
            'Strawberry puree'      => ['Fruit & Juice', 'ml', 'l', 1500, 50, 6000],
            'Mango puree'           => ['Fruit & Juice', 'ml', 'l', 1500, 45, 6000],
            'Blueberry puree'       => ['Fruit & Juice', 'ml', 'l', 1500, 60, 6000],
            'Lemon juice'           => ['Fruit & Juice', 'ml', 'l', 1500, 25, 6000],
            'Soda water'            => ['Fruit & Juice', 'ml', 'l', 5000, 6, 30000],

            // Frozen
            'Ice'                   => ['Frozen', 'g', 'kg', 8000, 0.2, 60000],
            'Vanilla ice cream'     => ['Frozen', 'ml', 'l', 1000, 20, 5000],
            'French fries'          => ['Frozen', 'g', 'kg', 3000, 16, 15000],
            'Chicken nuggets'       => ['Frozen', 'pc', 'pc', 60, 600, 300],

            // Pantry
            'Cooked rice'           => ['Pantry', 'g', 'kg', 5000, 6, 30000],
            'Pasta'                 => ['Pantry', 'g', 'kg', 3000, 12, 15000],
            'Cooking oil'           => ['Pantry', 'ml', 'l', 2000, 12, 10000],
            'Garlic'                => ['Pantry', 'g', 'kg', 300, 15, 2000],
            'Tomato sauce'          => ['Pantry', 'ml', 'l', 2000, 15, 8000],
            'Cream sauce'           => ['Pantry', 'ml', 'l', 2000, 22, 8000],
            'Pesto sauce'           => ['Pantry', 'g', 'kg', 500, 70, 2500],
            'Mayonnaise'            => ['Pantry', 'g', 'kg', 1000, 25, 4000],

            // Produce
            'Lettuce'               => ['Produce', 'g', 'kg', 1000, 15, 5000],
            'Tomato'                => ['Produce', 'g', 'kg', 1000, 10, 5000],

            // Protein
            'Chicken breast'          => ['Protein', 'g', 'kg', 3000, 28, 15000],
            'Chicken adobo (cooked)'  => ['Protein', 'g', 'kg', 3000, 32, 12000],
            'Beef tapa'               => ['Protein', 'g', 'kg', 2000, 45, 10000],
            'Tuna flakes'             => ['Protein', 'g', 'kg', 1500, 40, 8000],
            'Bacon strip'             => ['Protein', 'pc', 'pc', 40, 1200, 200],
            'Pork longganisa'         => ['Protein', 'pc', 'pc', 30, 1500, 150],
            'Egg'                     => ['Protein', 'pc', 'pc', 60, 900, 300],
            'Ham slice'               => ['Protein', 'pc', 'pc', 20, 900, 100],

            // Bakery
            'Sandwich bread'        => ['Bakery', 'pc', 'pc', 20, 600, 100],
            'Tortilla wrap'         => ['Bakery', 'pc', 'pc', 20, 800, 80],
            'Butter croissant'      => ['Bakery', 'pc', 'pc', 10, 3500, 40],
            'Chocolate croissant'   => ['Bakery', 'pc', 'pc', 10, 4000, 30],
            'Almond croissant'      => ['Bakery', 'pc', 'pc', 10, 5500, 30],
            'Blueberry muffin'      => ['Bakery', 'pc', 'pc', 10, 3500, 40],
            'Chocolate muffin'      => ['Bakery', 'pc', 'pc', 10, 4000, 40],
            'Cinnamon roll'         => ['Bakery', 'pc', 'pc', 10, 4000, 30],
            'Chocolate chip cookie' => ['Bakery', 'pc', 'pc', 20, 1800, 80],
            'Ensaymada'             => ['Bakery', 'pc', 'pc', 10, 3000, 40],
            'Pandesal'              => ['Bakery', 'pc', 'pc', 60, 300, 300],
            'Banana loaf slice'     => ['Bakery', 'pc', 'pc', 10, 2500, 40],

            // Desserts
            'Cheesecake slice'      => ['Desserts', 'pc', 'pc', 8, 6000, 24],
            'Chocolate cake slice'  => ['Desserts', 'pc', 'pc', 8, 5500, 24],
            'Carrot cake slice'     => ['Desserts', 'pc', 'pc', 8, 5000, 24],
            'Red velvet cake slice' => ['Desserts', 'pc', 'pc', 8, 6000, 24],
            'Tiramisu cup'          => ['Desserts', 'pc', 'pc', 8, 6500, 24],
            'Fudge brownie'         => ['Desserts', 'pc', 'pc', 10, 3000, 40],

            // Packaging
            'Hot cup 8oz'           => ['Packaging', 'pc', 'pc', 50, 300, 300],
            'Hot cup 12oz'          => ['Packaging', 'pc', 'pc', 50, 400, 300],
            'Cold cup 16oz'         => ['Packaging', 'pc', 'pc', 50, 400, 400],
            'Cold cup 22oz'         => ['Packaging', 'pc', 'pc', 50, 500, 300],
            'Hot lid'               => ['Packaging', 'pc', 'pc', 50, 150, 600],
            'Cold lid'              => ['Packaging', 'pc', 'pc', 50, 150, 700],
            'Dome lid'              => ['Packaging', 'pc', 'pc', 50, 250, 400],
            'Straw'                 => ['Packaging', 'pc', 'pc', 100, 80, 1000],
            'Cup sleeve'            => ['Packaging', 'pc', 'pc', 50, 150, 500],
            'Napkin'                => ['Packaging', 'pc', 'pc', 200, 50, 2000],
        ];
    }

    /**
     * supplier => [phone, ingredient categories it supplies]. Each category belongs to exactly one supplier.
     *
     * @return array<string, array{0: string, 1: array<int, string>}>
     */
    public static function suppliers(): array
    {
        return [
            'Bean & Brew Trading' => ['0917 000 0001', ['Coffee', 'Tea', 'Syrups & Bases', 'Fruit & Juice']],
            'Metro Fresh Supply'  => ['0917 000 0002', ['Dairy', 'Frozen', 'Produce', 'Protein', 'Packaging']],
            'Golden Oven Bakery'  => ['0917 000 0003', ['Bakery', 'Desserts']],
            'Kusina Pantry Depot' => ['0917 000 0004', ['Pantry']],
        ];
    }
}
