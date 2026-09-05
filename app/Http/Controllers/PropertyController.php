<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use App\Services\ApiActivityTracker;
use Inventorai\Laravel\Facades\Inventorai;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Demonstrates the Inventorai SDK's Properties resource.
 *
 * Uses Inventorai::properties() to list, filter, and view properties
 * from the connected Inventorai account.
 *
 * Available API filters: search (address), property_type, status, has_inspections
 * Available includes: landlord, inspections
 *
 * SDK errors are handled by the global exception handler in bootstrap/app.php.
 *
 * @see \Inventorai\SDK\Resources\Properties
 */
class PropertyController extends Controller
{
    /**
     * List properties with optional search and property type filtering.
     *
     * The Inventorai API supports server-side filtering via query parameters:
     * - filter[search]: searches across address_line_1, address_line_2, city, postcode
     * - filter[property_type]: exact match (house, flat, bungalow, etc.)
     *
     * Pagination is handled server-side with per_page (max 100) and page params.
     */
    public function index(Request $request): Response
    {
        $params = [
            'per_page' => 25,
            'page' => $request->integer('page', 1),
        ];

        if ($request->filled('search')) {
            $params['filter']['search'] = $request->input('search');
        }

        if ($request->filled('property_type')) {
            $params['filter']['property_type'] = $request->input('property_type');
        }

        $response = ApiActivityTracker::track('GET', '/properties', fn () =>
            Inventorai::properties()->list($params)
        );

        $properties = collect((array) ($response['data'] ?? []))->map(fn ($p) => $this->formatDates($p))->all();

        return Inertia::render('Properties/Index', [
            'properties' => $properties,
            'meta' => $response['meta'] ?? null,
            'filters' => $request->only(['search', 'property_type', 'page']),
            'teamId' => $this->teamId(),
        ]);
    }

    /**
     * Show a single property with its landlord and inspections.
     *
     * Uses the `include` parameter to eager-load related resources
     * in a single API call, avoiding N+1 requests.
     */
    public function show(string $id): Response
    {
        $response = ApiActivityTracker::track('GET', "/properties/{$id}", fn () =>
            Inventorai::properties()->get($id, ['include' => ['landlord', 'inspections']])
        );

        $property = $response['data'] ?? $response;
        $property = $this->formatDates($property);

        if (!empty($property['landlord']) && is_array($property['landlord'])) {
            $property['landlord'] = $this->formatDates($property['landlord']);
        }

        if (!empty($property['inspections'])) {
            $property['inspections'] = collect((array) $property['inspections'])
                ->map(fn ($i) => $this->formatDates($i))
                ->all();
        }

        return Inertia::render('Properties/Show', [
            'property' => $property,
            'teamId' => $this->teamId(),
        ]);
    }

    /**
     * The current team id, used for the realtime `team.{id}` broadcast channel.
     *
     * Sourced from the SDK's team resource and cached for 5 minutes.
     * Returns null if it can't be determined.
     */
    private function teamId(): ?string
    {
        $teamId = Cache::remember('inventorai:team_id', 300, function () {
            try {
                return Inventorai::team()->current()['data']['id'] ?? null;
            } catch (\Throwable) {
                return null;
            }
        });

        return $teamId !== null ? (string) $teamId : null;
    }

    /**
     * Format ISO date strings to UK format (e.g. Mon 21 Apr 2026).
     *
     * @param  array<array-key, mixed>  $data
     * @return array<array-key, mixed>
     */
    private function formatDates(array $data): array
    {
        $dateFields = ['created_at', 'updated_at', 'scheduled_at', 'completed_at', 'finalized_at'];

        foreach ($dateFields as $field) {
            if (!empty($data[$field])) {
                try {
                    $data[$field] = Carbon::parse($data[$field])->format('D j M Y');
                } catch (\Exception) {
                    // Leave as-is if unparseable
                }
            }
        }

        return $data;
    }
}
