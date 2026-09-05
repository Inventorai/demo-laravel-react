<?php

/**
 * Inspection page tests.
 *
 * Key things to know when working on inspections:
 * - The API defaults to scope=mine (only the token user's inspections)
 * - Pass scope=all to see all team inspections (requires inspections:all token ability)
 * - Types are grouped: Tenancy (move_in, periodic, move_out) and
 *   Non-Tenancy (vacant, pre_tenancy, landlord_only, between_tenancies)
 * - Available filters: status, type, property_id, inspector_id, from_date, to_date
 * - There is NO search filter on inspections (unlike properties)
 */

use App\Models\User;
use Inventorai\SDK\InventoraiClient;
use Inventorai\SDK\Exceptions\AuthenticationException;
use Inventorai\SDK\Exceptions\ApiException;
use Inventorai\SDK\Resources\AssetChecks;
use Inventorai\SDK\Resources\Compliance;
use Inventorai\SDK\Resources\Inspections;
use Inventorai\SDK\Resources\KeysFobs;
use Inventorai\SDK\Resources\MeterReadings;

beforeEach(function () {
    $this->user = User::factory()->create();
});

function mockInspections(Inspections $inspections): void
{
    $client = mock(InventoraiClient::class);
    $client->shouldReceive('inspections')->andReturn($inspections);
    app()->instance(InventoraiClient::class, $client);
}

test('inspections page renders for authenticated user', function () {
    $inspections = mock(Inspections::class);
    $inspections->shouldReceive('list')->andReturn([
        'data' => [],
        'meta' => ['total' => 0, 'current_page' => 1, 'last_page' => 1],
    ]);
    mockInspections($inspections);

    $this->actingAs($this->user)
        ->get('/inspections')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Inspections/Index')
            ->has('inspections')
            ->has('meta')
        );
});

test('inspections page requests scope=all and includes', function () {
    $inspections = mock(Inspections::class);
    $inspections->shouldReceive('list')
        ->withArgs(fn ($params) => $params['scope'] === 'all'
            && in_array('property', $params['include'])
            && in_array('inspector', $params['include'])
        )
        ->andReturn(['data' => [], 'meta' => ['total' => 0, 'current_page' => 1, 'last_page' => 1]]);
    mockInspections($inspections);

    $this->actingAs($this->user)
        ->get('/inspections')
        ->assertOk();
});

test('inspections page passes status filter to API', function () {
    $inspections = mock(Inspections::class);
    $inspections->shouldReceive('list')
        ->withArgs(fn ($params) => ($params['filter']['status'] ?? null) === 'completed')
        ->andReturn(['data' => [], 'meta' => ['total' => 0, 'current_page' => 1, 'last_page' => 1]]);
    mockInspections($inspections);

    $this->actingAs($this->user)
        ->get('/inspections?status=completed')
        ->assertOk();
});

test('inspections page passes type filter to API', function () {
    $inspections = mock(Inspections::class);
    $inspections->shouldReceive('list')
        ->withArgs(fn ($params) => ($params['filter']['type'] ?? null) === 'move_in')
        ->andReturn(['data' => [], 'meta' => ['total' => 0, 'current_page' => 1, 'last_page' => 1]]);
    mockInspections($inspections);

    $this->actingAs($this->user)
        ->get('/inspections?type=move_in')
        ->assertOk();
});

test('inspections page redirects with error on auth failure', function () {
    $inspections = mock(Inspections::class);
    $inspections->shouldReceive('list')->andThrow(new AuthenticationException('Invalid token'));
    mockInspections($inspections);

    $this->actingAs($this->user)
        ->get('/inspections')
        ->assertRedirect()
        ->assertSessionHas('error');
});

test('inspections page redirects with error on API failure', function () {
    $inspections = mock(Inspections::class);
    $inspections->shouldReceive('list')->andThrow(new ApiException('Server error', 500));
    mockInspections($inspections);

    $this->actingAs($this->user)
        ->get('/inspections')
        ->assertRedirect()
        ->assertSessionHas('error');
});

/**
 * The show page and the records that hang off an inspection.
 *
 * Reads are one call — everything the page needs comes back through
 * `include`. Writes are the opposite: each record type has its own SDK
 * resource, and the app's routes wrap one SDK method each.
 */
function mockClient(string $method, object $resource): void
{
    $client = mock(InventoraiClient::class);
    $client->shouldReceive($method)->andReturn($resource);
    app()->instance(InventoraiClient::class, $client);
}

test('inspection show pulls areas, meters, keys, compliance and asset checks in one call', function () {
    $inspections = mock(Inspections::class);
    $inspections->shouldReceive('get')
        ->once()
        ->withArgs(function ($id, $params) {
            $includes = $params['include'];

            return $id === 'insp-1'
                && in_array('areas.items.elements', $includes)
                && in_array('meterReadings', $includes)
                && in_array('keysFobs', $includes)
                && in_array('assetChecks.propertyAsset.propertyArea', $includes)
                && in_array('complianceForms.sections.fields.responses', $includes);
        })
        ->andReturn(['data' => ['id' => 'insp-1', 'areas' => []]]);
    mockInspections($inspections);

    $this->actingAs($this->user)
        ->get('/inspections/insp-1')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Inspections/Show')
            ->where('inspection.id', 'insp-1')
        );
});

test('a meter reading can be created', function () {
    $meters = mock(MeterReadings::class);
    $meters->shouldReceive('create')
        ->once()
        ->withArgs(fn ($inspectionId, $data) => $inspectionId === 'insp-1'
            && $data['meter_type'] === 'electricity'
            && $data['reading'] === 1234.5
            && $data['is_prepaid'] === true
        )
        ->andReturn(['data' => ['id' => 'meter-1']]);
    mockClient('meterReadings', $meters);

    $this->actingAs($this->user)
        ->post('/inspections/insp-1/meters', [
            'meter_type' => 'electricity',
            'reading' => 1234.5,
            'reading_unit' => 'kWh',
            'is_prepaid' => true,
            'meter_balance' => 12.34,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');
});

test('a meter reading rejects an unknown meter type', function () {
    $this->actingAs($this->user)
        ->post('/inspections/insp-1/meters', ['meter_type' => 'plutonium'])
        ->assertSessionHasErrors('meter_type');
});

test('a meter reading can be updated and deleted', function () {
    $meters = mock(MeterReadings::class);
    $meters->shouldReceive('update')->once()->with('insp-1', 'meter-1', Mockery::type('array'))->andReturn([]);
    $meters->shouldReceive('delete')->once()->with('insp-1', 'meter-1')->andReturn([]);
    mockClient('meterReadings', $meters);

    $this->actingAs($this->user)
        ->patch('/inspections/insp-1/meters/meter-1', ['meter_type' => 'gas', 'reading' => 42])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->actingAs($this->user)
        ->delete('/inspections/insp-1/meters/meter-1')
        ->assertRedirect()
        ->assertSessionHas('success');
});

test('a key can be created', function () {
    $keys = mock(KeysFobs::class);
    $keys->shouldReceive('create')
        ->once()
        ->withArgs(fn ($inspectionId, $data) => $inspectionId === 'insp-1'
            && $data['item_type'] === 'front_door_key'
            && $data['quantity'] === 2
        )
        ->andReturn(['data' => ['id' => 'key-1']]);
    mockClient('keysFobs', $keys);

    $this->actingAs($this->user)
        ->post('/inspections/insp-1/keys', [
            'item_type' => 'front_door_key',
            'description' => 'Yale, brass',
            'quantity' => 2,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');
});

test('a key rejects an unknown item type', function () {
    $this->actingAs($this->user)
        ->post('/inspections/insp-1/keys', ['item_type' => 'skeleton_key', 'quantity' => 1])
        ->assertSessionHasErrors('item_type');
});

test('a key can be updated and deleted', function () {
    $keys = mock(KeysFobs::class);
    $keys->shouldReceive('update')->once()->with('insp-1', 'key-1', Mockery::type('array'))->andReturn([]);
    $keys->shouldReceive('delete')->once()->with('insp-1', 'key-1')->andReturn([]);
    mockClient('keysFobs', $keys);

    $this->actingAs($this->user)
        ->patch('/inspections/insp-1/keys/key-1', ['item_type' => 'entry_fob', 'quantity' => 3])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->actingAs($this->user)
        ->delete('/inspections/insp-1/keys/key-1')
        ->assertRedirect()
        ->assertSessionHas('success');
});

test('a compliance answer keeps the type the field expects', function () {
    $compliance = mock(Compliance::class);
    // A yes_no field stores a boolean, not the string "true".
    $compliance->shouldReceive('updateResponse')
        ->once()
        ->withArgs(fn ($inspectionId, $fieldId, $data) => $inspectionId === 'insp-1'
            && $fieldId === 'field-9'
            && $data['value'] === true
        )
        ->andReturn(['success' => true]);
    mockClient('compliance', $compliance);

    $this->actingAs($this->user)
        ->patchJson('/inspections/insp-1/compliance/field-9', ['value' => true])
        ->assertRedirect()
        ->assertSessionHas('success');
});

test('a compliance answer can be cleared', function () {
    $compliance = mock(Compliance::class);
    $compliance->shouldReceive('updateResponse')
        ->once()
        ->withArgs(fn ($inspectionId, $fieldId, $data) => $data['value'] === null)
        ->andReturn(['success' => true]);
    mockClient('compliance', $compliance);

    $this->actingAs($this->user)
        ->patchJson('/inspections/insp-1/compliance/field-9', ['value' => null])
        ->assertRedirect()
        ->assertSessionHas('success');
});

test('an asset check records its test result', function () {
    $checks = mock(AssetChecks::class);
    $checks->shouldReceive('update')
        ->once()
        ->withArgs(fn ($inspectionId, $checkId, $data) => $checkId === 'check-1'
            && $data['tested'] === 'yes'
            && $data['test_result'] === 'pass'
            && $data['condition'] === 'good'
        )
        ->andReturn(['data' => ['id' => 'check-1']]);
    mockClient('assetChecks', $checks);

    $this->actingAs($this->user)
        ->patch('/inspections/insp-1/asset-checks/check-1', [
            'tested' => 'yes',
            'test_result' => 'pass',
            'condition' => 'good',
            'notes' => 'Sounded on test.',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');
});

test('an asset check rejects an unknown test result', function () {
    $this->actingAs($this->user)
        ->patch('/inspections/insp-1/asset-checks/check-1', ['test_result' => 'maybe'])
        ->assertSessionHasErrors('test_result');
});
