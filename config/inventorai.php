<?php

return [
    /*
    |--------------------------------------------------------------------------
    | API Token
    |--------------------------------------------------------------------------
    |
    | Your Inventorai team API token. Generate one from Team Settings > API
    | in your Inventorai dashboard.
    |
    */
    'token' => env('INVENTORAI_API_TOKEN'),

    /*
    |--------------------------------------------------------------------------
    | Base URL
    |--------------------------------------------------------------------------
    |
    | The base URL for the Inventorai API. You shouldn't need to change this
    | unless you're running a local development instance.
    |
    */
    'base_url' => env('INVENTORAI_API_URL', 'https://api.inventorai.co.uk/v1/team'),
];
