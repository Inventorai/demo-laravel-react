<?php

/**
 * Settings page tests.
 *
 * The settings page shows the API connection status by making a
 * lightweight properties list call (per_page=1). SDK errors are
 * handled by the HandleInventoraiErrors middleware.
 */

use App\Models\User;
use Inventorai\SDK\InventoraiClient;
use Inventorai\SDK\Exceptions\AuthenticationException;
use Inventorai\SDK\Resources\Properties;

beforeEach(function () {
    $this->user = User::factory()->create();
});

test('settings page shows connected status', function () {
    $properties = mock(Properties::class);
    $properties->shouldReceive('list')->andReturn([
        'data' => [['id' => '1']],
        'meta' => ['total' => 42],
    ]);

    $client = mock(InventoraiClient::class);
    $client->shouldReceive('properties')->andReturn($properties);
    $this->app->instance(InventoraiClient::class, $client);

    $this->actingAs($this->user)
        ->get('/settings')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Settings/Index')
            ->where('connected', true)
            ->where('propertyCount', 42)
        );
});

test('settings page redirects with error when token is invalid', function () {
    $properties = mock(Properties::class);
    $properties->shouldReceive('list')->andThrow(new AuthenticationException('Unauthenticated'));

    $client = mock(InventoraiClient::class);
    $client->shouldReceive('properties')->andReturn($properties);
    $this->app->instance(InventoraiClient::class, $client);

    $this->actingAs($this->user)
        ->get('/settings')
        ->assertRedirect()
        ->assertSessionHas('error');
});
