<?php

/*
 |--------------------------------------------------------------------------
 | Store settings definitions
 |--------------------------------------------------------------------------
 |
 | Every setting the owner can change is defined here once: its group, label,
 | type, default and validation rules. The settings page, the validation and
 | the seeder are all generated from this file, so adding a setting means adding
 | one entry here and nothing else.
 |
 | Types: string, text, int, decimal, bool.
 | Keys use underscores (no dots) so they work as form field names.
 */

return [
    'groups' => [

        'business' => [
            'label' => 'Business',
            'description' => 'Shown on receipts and reports.',
            'fields' => [
                'business_name' => [
                    'label' => 'Business name',
                    'type' => 'string',
                    'default' => 'My Coffee Shop',
                    'rules' => ['required', 'string', 'max:150'],
                ],
                'business_address' => [
                    'label' => 'Address',
                    'type' => 'text',
                    'default' => null,
                    'rules' => ['nullable', 'string', 'max:500'],
                ],
                'business_phone' => [
                    'label' => 'Phone',
                    'type' => 'string',
                    'default' => null,
                    'rules' => ['nullable', 'string', 'max:30'],
                ],
                'business_tin' => [
                    'label' => 'TIN',
                    'type' => 'string',
                    'default' => null,
                    'help' => 'Tax identification number printed on receipts.',
                    'rules' => ['nullable', 'string', 'max:30'],
                ],
            ],
        ],

        'receipt' => [
            'label' => 'Receipt',
            'description' => 'Text printed at the top and bottom of every receipt.',
            'fields' => [
                'receipt_header' => [
                    'label' => 'Header',
                    'type' => 'text',
                    'default' => null,
                    'rules' => ['nullable', 'string', 'max:500'],
                ],
                'receipt_footer' => [
                    'label' => 'Footer',
                    'type' => 'text',
                    'default' => 'Thank you for your purchase!',
                    'rules' => ['nullable', 'string', 'max:500'],
                ],
            ],
        ],

        'orders' => [
            'label' => 'Orders',
            'description' => 'How pickup numbers and the business day work.',
            'fields' => [
                'orders_pickup_prefix' => [
                    'label' => 'Pickup number prefix',
                    'type' => 'string',
                    'default' => null,
                    'help' => 'Up to 4 characters, for example A, which gives A-001.',
                    'rules' => ['nullable', 'string', 'max:4'],
                ],
                'orders_cutoff_hour' => [
                    'label' => 'Business day starts at (hour, 0 to 23)',
                    'type' => 'int',
                    'default' => 4,
                    'min' => 0,
                    'max' => 23,
                    'step' => 1,
                    'help' => 'Orders before this hour count toward the previous business day.',
                    'rules' => ['required', 'integer', 'between:0,23'],
                ],
            ],
        ],

        'shifts' => [
            'label' => 'Shifts',
            'description' => 'Cash handling rules.',
            'fields' => [
                'shifts_require_open_shift' => [
                    'label' => 'Require an open shift before taking payments',
                    'type' => 'bool',
                    'default' => true,
                    'rules' => ['boolean'],
                ],
            ],
        ],

        'kitchen' => [
            'label' => 'Kitchen',
            'description' => 'When tickets on the kitchen display change color.',
            'fields' => [
                'kitchen_warning_minutes' => [
                    'label' => 'Warning after (minutes)',
                    'type' => 'int',
                    'default' => 5,
                    'min' => 1,
                    'max' => 120,
                    'step' => 1,
                    'rules' => ['required', 'integer', 'between:1,120'],
                ],
                'kitchen_late_minutes' => [
                    'label' => 'Late after (minutes)',
                    'type' => 'int',
                    'default' => 10,
                    'min' => 1,
                    'max' => 240,
                    'step' => 1,
                    'help' => 'Must be greater than the warning time.',
                    'rules' => ['required', 'integer', 'between:1,240', 'gt:kitchen_warning_minutes'],
                ],
            ],
        ],

    ],
];
