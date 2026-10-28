<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Broadcaster
    |--------------------------------------------------------------------------
    |
    | "null" means nothing is broadcast: the kitchen and cashier screens poll instead.
    | Set BROADCAST_CONNECTION=reverb once Reverb is installed and its connection
    | is added below.
    |
    */

    'default' => env('BROADCAST_CONNECTION', 'null'),

    'connections' => [
        'options' => [
            'cluster' => 'ap1',
            'useTLS' => true
        ],
        'log' => [
            'driver' => 'log',
        ],

        'null' => [
            'driver' => 'null',
        ],

    ],

];
