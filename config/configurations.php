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
                    'default' => 'A',
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
                'shifts_variance_attention_cents' => [
                    'label' => 'Dashboard alert when a closed shift is off by at least (centavos)',
                    'type' => 'int',
                    'default' => 5000,
                    'min' => 0,
                    'max' => 100000000,
                    'step' => 100,
                    'rules' => ['required', 'integer', 'min:0'],
                ],
            ],
        ],

        'payments' => [
            'label' => 'Payments',
            'description' => 'What staff and kiosk customers see about paying.',
            'fields' => [
                'payments_kiosk_instructions' => [
                    'label' => 'Kiosk payment message',
                    'type' => 'text',
                    'default' => 'Pay at the counter with cash, GCash, Maya, or card. Show your pickup number to the cashier.',
                    'help' => 'Shown on the kiosk order screen before placing an order.',
                    'rules' => ['nullable', 'string', 'max:500'],
                ],
                'payments_pos_ewallet_help' => [
                    'label' => 'Register e-wallet help',
                    'type' => 'text',
                    'default' => 'For GCash, Maya, or bank transfer, enter the amount and the reference number from the customer\'s app.',
                    'help' => 'Shown at checkout when staff choose a non-cash payment method.',
                    'rules' => ['nullable', 'string', 'max:500'],
                ],
            ],
        ],

        'loyalty' => [
            'label' => 'Loyalty',
            'description' => 'Simple points when a linked customer pays in full.',
            'fields' => [
                'loyalty_enabled' => [
                    'label' => 'Enable loyalty points',
                    'type' => 'bool',
                    'default' => true,
                    'rules' => ['boolean'],
                ],
                'loyalty_cents_per_point' => [
                    'label' => 'Centavos spent for 1 point',
                    'type' => 'int',
                    'default' => 10000,
                    'min' => 100,
                    'max' => 1000000,
                    'step' => 100,
                    'help' => 'Example: 10000 means ₱100.00 of order total earns 1 point.',
                    'rules' => ['required', 'integer', 'min:100'],
                ],
                'loyalty_redeem_centavos_per_point' => [
                    'label' => 'Centavos off per point redeemed',
                    'type' => 'int',
                    'default' => 10000,
                    'min' => 100,
                    'max' => 1000000,
                    'step' => 100,
                    'help' => 'Example: 10000 means each point redeemed takes ₱100.00 off the order total.',
                    'rules' => ['required', 'integer', 'min:100'],
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
