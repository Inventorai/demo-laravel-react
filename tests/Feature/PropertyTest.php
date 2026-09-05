<?php

/**
 * Property page tests.
 *
 * These tests mock the Inventorai SDK to avoid hitting the real API.
 * The SDK is resolved from the container as a singleton, so we can
 * easily swap it with a mock in each test.
 *
 * SDK errors are handled by HandleInventoraiErrors middleware, which
 * flashes the error and redirects back. Tests for error handling
 * verify this redirect + flash behaviour.
 */

use App\Models\User;
use Inventorai\SDK\InventoraiClient;
use Inventorai\SDK\Exceptions\AuthenticationException;
use Inventorai\SDK\Exceptions\ApiException;
use Inventorai\SDK\Resources\Properties;

beforeEach(function () {
    $this->user = User::factory()->create();
});

function mockProperties(Properties $properties): void
{
    $client = mock(InventoraiClient::class);
    $client->shouldReceive('properties')->andReturn($properties);
    app()->instance(InventoraiClient::class, $client);
}

test('properties page renders for authenticated user', function () {
    $properties = mock(Properties::class);
    $properties->shouldReceive('list')->andReturn([
        'data' => [],
        'meta' => ['total' => 0, 'current_page' => 1, 'last_page' => 1],
    ]);
    mockProperties($properties);

    $this->actingAs($this->user)
        ->get('/properties')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Properties/Index')
            ->has('properties')
            ->has('meta')
        );
});

test('properties page displays API data', function () {
    $properties = mock(Properties::class);
    $properties->shouldReceive('list')->andReturn([
        'data' => [
            [
                'id' => 'abc123',
                'address' => [
                    'line_1' => '10 Downing Street',
                    'city' => 'London',
                    'postcode' => 'SW1A 2AA',
                    'full_address' => '10 Downing Street, London, SW1A 2AA',
                ],
                'property_type' => 'house',
                'is_residential' => true,
                'image' => null,
            ],
        ],
        'meta' => ['total' => 1, 'current_page' => 1, 'last_page' => 1],
    ]);
    mockProperties($properties);

    $this->actingAs($this->user)
        ->get('/properties')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Properties/Index')
            ->has('properties', 1)
            ->where('properties.0.address.line_1', '10 Downing Street')
        );
});

test('properties page passes search filter to API', function () {
    $properties = mock(Properties::class);
    $properties->shouldReceive('list')
        ->withArgs(fn ($params) => ($params['filter']['search'] ?? null) === 'London')
        ->andReturn(['data' => [], 'meta' => ['total' => 0, 'current_page' => 1, 'last_page' => 1]]);
    mockProperties($properties);

    $this->actingAs($this->user)
        ->get('/properties?search=London')
        ->assertOk();
});

test('properties page passes property_type filter to API', function () {
    $properties = mock(Properties::class);
    $properties->shouldReceive('list')
        ->withArgs(fn ($params) => ($params['filter']['property_type'] ?? null) === 'flat')
        ->andReturn(['data' => [], 'meta' => ['total' => 0, 'current_page' => 1, 'last_page' => 1]]);
    mockProperties($properties);

    $this->actingAs($this->user)
        ->get('/properties?property_type=flat')
        ->assertOk();
});

test('properties page redirects with error on auth failure', function () {
    $properties = mock(Properties::class);
    $properties->shouldReceive('list')->andThrow(new AuthenticationException('Invalid token'));
    mockProperties($properties);

    $this->actingAs($this->user)
        ->get('/properties')
        ->assertRedirect()
        ->assertSessionHas('error');
});

test('properties page redirects with error on API failure', function () {
    $properties = mock(Properties::class);
    $properties->shouldReceive('list')->andThrow(new ApiException('Server error', 500));
    mockProperties($properties);

    $this->actingAs($this->user)
        ->get('/properties')
        ->assertRedirect()
        ->assertSessionHas('error');
});

test('property detail page renders with includes', function () {
    $properties = mock(Properties::class);
    $properties->shouldReceive('get')
        ->withArgs(fn ($id, $params) => $id === 'abc123'
            && in_array('landlord', $params['include'])
            && in_array('inspections', $params['include'])
        )
        ->andReturn([
            'data' => [
                'id' => 'abc123',
                'address' => ['line_1' => '10 Downing Street', 'full_address' => '10 Downing Street'],
                'property_type' => 'house',
            ],
        ]);
    mockProperties($properties);

    $this->actingAs($this->user)
        ->get('/properties/abc123')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Properties/Show')
            ->has('property')
        );
});
