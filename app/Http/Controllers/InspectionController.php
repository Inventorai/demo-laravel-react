<?php

namespace App\Http\Controllers;

use App\Services\ApiActivityTracker;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;
use Inventorai\Laravel\Facades\Inventorai;
use Inventorai\SDK\Resources\AssetChecks;
use Inventorai\SDK\Resources\Compliance;
use Inventorai\SDK\Resources\InspectionAreas;
use Inventorai\SDK\Resources\InspectionItems;
use Inventorai\SDK\Resources\Inspections;
use Inventorai\SDK\Resources\KeysFobs;
use Inventorai\SDK\Resources\MeterReadings;

/**
 * Demonstrates the Inventorai SDK's Inspections resource.
 *
 * Uses Inventorai::inspections() to list, filter, and view inspections.
 * The show page demonstrates editing areas and items via the SDK.
 *
 * Important: The API defaults to scope=mine (only inspections assigned to
 * the authenticated user as inspector). For third-party API tokens, pass
 * scope=all to see all team inspections. The token must have the
 * 'inspections:all' ability for this to work.
 *
 * Inspection types are grouped into two categories:
 * - Tenancy: move_in, periodic, move_out
 * - Non-tenancy: vacant, pre_tenancy, landlord_only, between_tenancies
 *
 * Editable area fields: name, condition (poor|fair|good|excellent),
 *   cleanliness (dirty|fair|clean|spotless), notes
 *
 * Editable item fields: name, condition, cleanliness, description, notes
 *
 * The show page also covers the four record types that sit alongside the
 * area/item tree, each with its own SDK resource:
 * - Meter readings   — gas, electricity, water; prepaid meters carry a balance
 * - Keys & fobs      — a typed count of what was handed over
 * - Compliance       — a snapshot of the team's forms, one response per field
 * - Asset checks     — alarms and safety equipment, tested per property asset
 *
 * SDK errors are handled by the global exception handler in bootstrap/app.php.
 *
 * @see Inspections
 * @see InspectionAreas
 * @see InspectionItems
 * @see MeterReadings
 * @see KeysFobs
 * @see Compliance
 * @see AssetChecks
 */
class InspectionController extends Controller
{
    /**
     * The team the API token belongs to, used to subscribe to its private
     * broadcast channel. Cached for 5 minutes, mirroring PropertyController.
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
     * Tenancy and non-tenancy inspection types, matching the filter dropdown.
     *
     * @var list<string>
     */
    private const LISTED_TYPES = [
        'move_in', 'periodic', 'move_out',
        'vacant', 'pre_tenancy', 'landlord_only', 'between_tenancies',
    ];

    /**
     * Key and fob types the API accepts on a keys-fobs record.
     *
     * @var list<string>
     */
    private const KEY_TYPES = [
        'front_door_key', 'back_door_key', 'mailbox_key', 'window_key',
        'entry_fob', 'garage_remote', 'gate_remote', 'other',
    ];

    /**
     * List inspections with optional type and status filtering.
     */
    public function index(Request $request): Response
    {
        $params = [
            'per_page' => 25,
            'page' => $request->integer('page', 1),
            'scope' => 'all',
            'include' => ['property', 'inspector'],
        ];

        if ($request->filled('status')) {
            $params['filter']['status'] = $request->input('status');
        }

        // Only tenancy and non-tenancy inspections belong in this list.
        // Maintenance inspections come out of the defect workflow rather than
        // an inspection booking, so they are excluded unless asked for by name.
        $params['filter']['type'] = $request->filled('type')
            ? $request->input('type')
            : implode(',', self::LISTED_TYPES);

        $response = ApiActivityTracker::track('GET', '/inspections', fn () => Inventorai::inspections()->list($params)
        );

        $inspections = collect((array) ($response['data'] ?? []))
            ->map(fn ($i) => $this->formatDates($i))
            ->all();

        return Inertia::render('Inspections/Index', [
            'inspections' => $inspections,
            'meta' => $response['meta'] ?? null,
            'filters' => $request->only(['status', 'type', 'page']),
            'teamId' => $this->teamId(),
        ]);
    }

    /**
     * Show a single inspection with all related data in one call.
     *
     * Demonstrates the canonical read pattern: assemble everything you need
     * through `include` rather than firing follow-up requests to
     * inspectionAreas()->list(), inspectionItems()->list(), etc.
     *
     * The granular sub-resource SDKs are reserved for *writes* (see
     * updateArea / updateItem / uploadAreaPhoto below) and mobile sync
     * (paginating one slice, re-pulling after a change).
     */
    public function show(string $id): Response
    {
        $response = ApiActivityTracker::track('GET', "/inspections/{$id}", fn () => Inventorai::inspections()->get($id, [
            'include' => [
                'property', 'property.currentTenancy.tenants',
                'inspector',
                'areas.items.elements',
                'meterReadings', 'keysFobs',
                'assetChecks.propertyAsset.propertyArea',
                'complianceForms.sections.fields.responses',
            ],
        ])
        );

        $inspection = $response['data'] ?? $response;
        $inspection = $this->formatDates($inspection);

        return Inertia::render('Inspections/Show', [
            'inspection' => $inspection,
        ]);
    }

    /**
     * Update an area's condition, cleanliness, or notes.
     *
     * Uses Inventorai::inspectionAreas()->update() which sends a
     * PATCH request to /inspections/{id}/areas/{areaId}.
     */
    public function updateArea(string $inspectionId, string $areaId, Request $request): RedirectResponse
    {
        $data = $request->validate([
            'condition' => ['nullable', 'in:poor,fair,good,excellent'],
            'cleanliness' => ['nullable', 'in:dirty,fair,clean,spotless'],
            'notes' => ['nullable', 'string'],
        ]);

        ApiActivityTracker::track('PATCH', "/inspections/{$inspectionId}/areas/{$areaId}", fn () => Inventorai::inspectionAreas()->update($inspectionId, $areaId, $data)
        );

        return back()->with('success', 'Area updated.');
    }

    /**
     * Update an item's condition, cleanliness, description, or notes.
     *
     * Uses Inventorai::inspectionItems()->update() which sends a
     * PATCH request to /inspections/{id}/items/{itemId}.
     */
    public function updateItem(string $inspectionId, string $itemId, Request $request): RedirectResponse
    {
        $data = $request->validate([
            'condition' => ['nullable', 'in:poor,fair,good,excellent'],
            'cleanliness' => ['nullable', 'in:dirty,fair,clean,spotless'],
            'description' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        ApiActivityTracker::track('PATCH', "/inspections/{$inspectionId}/items/{$itemId}", fn () => Inventorai::inspectionItems()->update($inspectionId, $itemId, $data)
        );

        return back()->with('success', 'Item updated.');
    }

    /**
     * Upload a photo to an area.
     *
     * Uses Inventorai::inspectionAreas()->uploadPhoto() which sends a
     * multipart POST to /inspections/{id}/areas/{areaId}/photos.
     */
    public function uploadAreaPhoto(string $inspectionId, string $areaId, Request $request): RedirectResponse
    {
        $request->validate(['file' => ['required', 'image', 'max:10240']]);

        ApiActivityTracker::track('POST', "/inspections/{$inspectionId}/areas/{$areaId}/photos", fn () => Inventorai::inspectionAreas()->uploadPhoto($inspectionId, $areaId, $request->file('file')->getRealPath(), $request->file('file')->getClientOriginalName())
        );

        return back()->with('success', 'Photo uploaded.');
    }

    /**
     * Upload a photo to an item.
     *
     * Uses Inventorai::inspectionItems()->uploadPhoto() which sends a
     * multipart POST to /inspections/{id}/items/{itemId}/photos.
     */
    public function uploadItemPhoto(string $inspectionId, string $itemId, Request $request): RedirectResponse
    {
        $request->validate(['file' => ['required', 'image', 'max:10240']]);

        ApiActivityTracker::track('POST', "/inspections/{$inspectionId}/items/{$itemId}/photos", fn () => Inventorai::inspectionItems()->uploadPhoto($inspectionId, $itemId, $request->file('file')->getRealPath(), $request->file('file')->getClientOriginalName())
        );

        return back()->with('success', 'Photo uploaded.');
    }

    /**
     * Create a meter reading on an inspection.
     *
     * Uses Inventorai::meterReadings()->create() which sends a
     * POST request to /inspections/{id}/meter-readings.
     */
    public function storeMeter(string $inspectionId, Request $request): RedirectResponse
    {
        $data = $request->validate([
            'meter_type' => ['required', 'in:gas,electricity,water,other'],
            'meter_location' => ['nullable', 'string', 'max:255'],
            'meter_serial' => ['nullable', 'string', 'max:255'],
            'reading' => ['nullable', 'numeric', 'min:0'],
            'reading_unit' => ['nullable', 'string', 'max:50'],
            'meter_balance' => ['nullable', 'numeric'],
            'is_prepaid' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        ApiActivityTracker::track('POST', "/inspections/{$inspectionId}/meter-readings", fn () => Inventorai::meterReadings()->create($inspectionId, $data)
        );

        return back()->with('success', 'Meter reading added.');
    }

    /**
     * Update a meter reading.
     *
     * Uses Inventorai::meterReadings()->update() which sends a
     * PATCH request to /inspections/{id}/meter-readings/{meterReadingId}.
     */
    public function updateMeter(string $inspectionId, string $meterId, Request $request): RedirectResponse
    {
        $data = $request->validate([
            'meter_type' => ['required', 'in:gas,electricity,water,other'],
            'meter_location' => ['nullable', 'string', 'max:255'],
            'meter_serial' => ['nullable', 'string', 'max:255'],
            'reading' => ['nullable', 'numeric', 'min:0'],
            'reading_unit' => ['nullable', 'string', 'max:50'],
            'meter_balance' => ['nullable', 'numeric'],
            'is_prepaid' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        ApiActivityTracker::track('PATCH', "/inspections/{$inspectionId}/meter-readings/{$meterId}", fn () => Inventorai::meterReadings()->update($inspectionId, $meterId, $data)
        );

        return back()->with('success', 'Meter reading updated.');
    }

    /**
     * Delete a meter reading.
     *
     * Uses Inventorai::meterReadings()->delete() which sends a
     * DELETE request to /inspections/{id}/meter-readings/{meterReadingId}.
     */
    public function destroyMeter(string $inspectionId, string $meterId): RedirectResponse
    {
        ApiActivityTracker::track('DELETE', "/inspections/{$inspectionId}/meter-readings/{$meterId}", fn () => Inventorai::meterReadings()->delete($inspectionId, $meterId)
        );

        return back()->with('success', 'Meter reading removed.');
    }

    /**
     * Add a key or fob to an inspection.
     *
     * Uses Inventorai::keysFobs()->create() which sends a
     * POST request to /inspections/{id}/keys-fobs.
     */
    public function storeKey(string $inspectionId, Request $request): RedirectResponse
    {
        $data = $request->validate([
            'item_type' => ['required', 'in:'.implode(',', self::KEY_TYPES)],
            'description' => ['nullable', 'string', 'max:255'],
            'quantity' => ['required', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        ApiActivityTracker::track('POST', "/inspections/{$inspectionId}/keys-fobs", fn () => Inventorai::keysFobs()->create($inspectionId, $data)
        );

        return back()->with('success', 'Key added.');
    }

    /**
     * Update a key or fob.
     *
     * Uses Inventorai::keysFobs()->update() which sends a
     * PATCH request to /inspections/{id}/keys-fobs/{keyFobId}.
     */
    public function updateKey(string $inspectionId, string $keyId, Request $request): RedirectResponse
    {
        $data = $request->validate([
            'item_type' => ['required', 'in:'.implode(',', self::KEY_TYPES)],
            'description' => ['nullable', 'string', 'max:255'],
            'quantity' => ['required', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        ApiActivityTracker::track('PATCH', "/inspections/{$inspectionId}/keys-fobs/{$keyId}", fn () => Inventorai::keysFobs()->update($inspectionId, $keyId, $data)
        );

        return back()->with('success', 'Key updated.');
    }

    /**
     * Delete a key or fob.
     *
     * Uses Inventorai::keysFobs()->delete() which sends a
     * DELETE request to /inspections/{id}/keys-fobs/{keyFobId}.
     */
    public function destroyKey(string $inspectionId, string $keyId): RedirectResponse
    {
        ApiActivityTracker::track('DELETE', "/inspections/{$inspectionId}/keys-fobs/{$keyId}", fn () => Inventorai::keysFobs()->delete($inspectionId, $keyId)
        );

        return back()->with('success', 'Key removed.');
    }

    /**
     * Answer a single compliance question.
     *
     * Uses Inventorai::compliance()->updateResponse() which sends a
     * PATCH request to /inspections/{id}/compliance/fields/{fieldId}.
     *
     * The API types the stored value from the field's own field_type, so
     * `value` is deliberately untyped here — a yes_no field wants a boolean,
     * a date field an ISO date string, a number field a number.
     *
     * The token needs the 'compliance:write' ability for this to work.
     */
    public function updateCompliance(string $inspectionId, string $fieldId, Request $request): RedirectResponse
    {
        $data = $request->validate([
            'value' => ['present'],
            'section_instance' => ['nullable', 'integer', 'min:1'],
        ]);

        ApiActivityTracker::track('PATCH', "/inspections/{$inspectionId}/compliance/fields/{$fieldId}", fn () => Inventorai::compliance()->updateResponse($inspectionId, $fieldId, $data)
        );

        return back()->with('success', 'Compliance answer saved.');
    }

    /**
     * Record an alarm / safety equipment check.
     *
     * Uses Inventorai::assetChecks()->update() which sends a
     * PUT request to /inspections/{id}/asset-checks/{assetCheckId}.
     */
    public function updateAssetCheck(string $inspectionId, string $checkId, Request $request): RedirectResponse
    {
        $data = $request->validate([
            'tested' => ['nullable', 'in:yes,no,not_accessible'],
            'test_result' => ['nullable', 'in:pass,fail,na'],
            'condition' => ['nullable', 'in:good,fair,poor,replace'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        ApiActivityTracker::track('PUT', "/inspections/{$inspectionId}/asset-checks/{$checkId}", fn () => Inventorai::assetChecks()->update($inspectionId, $checkId, $data)
        );

        return back()->with('success', 'Check saved.');
    }

    /**
     * Search phrases for autocomplete suggestions.
     *
     * Proxies to Inventorai::phrases()->search() which hits
     * GET /phrases/search?q=...&category=...&limit=...
     *
     * The token needs the 'phrases:read' ability for this to work.
     */
    public function searchPhrases(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:200'],
            'category' => ['nullable', 'in:area,item,element'],
            'context' => ['nullable', 'string', 'max:100'],
            'items' => ['nullable', 'string', 'max:500'],
            'item_name' => ['nullable', 'string', 'max:100'],
        ]);

        $params = array_filter([
            'q' => $request->input('q'),
            'category' => $request->input('category', 'item'),
            'context' => $request->input('context'),
            'items' => $request->input('items'),
            'item_name' => $request->input('item_name'),
            'limit' => 20,
        ]);

        $response = ApiActivityTracker::track('GET', '/phrases/search', fn () => Inventorai::phrases()->search($params)
        );

        return response()->json($response['data']['phrases'] ?? []);
    }

    /**
     * Format ISO date strings to UK format (e.g. Mon 21 Apr 2026).
     *
     * @param  array<array-key, mixed>  $data
     * @return array<array-key, mixed>
     */
    private function formatDates(array $data): array
    {
        $dateFields = ['created_at', 'updated_at', 'scheduled_at', 'completed_at', 'started_at'];

        foreach ($dateFields as $field) {
            if (! empty($data[$field])) {
                try {
                    $data[$field] = Carbon::parse($data[$field])->format('D j M Y');
                } catch (\Exception) {
                }
            }
        }

        return $data;
    }
}
