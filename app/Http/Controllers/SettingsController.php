<?php

namespace App\Http\Controllers;

use App\Services\ApiActivityTracker;
use Inventorai\Laravel\Facades\Inventorai;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Shows API connection status.
 *
 * Tests the connection by making a lightweight properties list call
 * (per_page=1). If the token is invalid or the API is down, the
 * global exception handler in bootstrap/app.php will redirect back
 * with a flash error.
 *
 * @see \Inventorai\SDK\Resources\Properties
 */
class SettingsController extends Controller
{
    public function index(): Response
    {
        $response = ApiActivityTracker::track('GET', '/properties', fn () =>
            Inventorai::properties()->list(['per_page' => 1])
        );

        return Inertia::render('Settings/Index', [
            'connected' => true,
            'propertyCount' => $response['meta']['total'] ?? count($response['data'] ?? []),
        ]);
    }
}
