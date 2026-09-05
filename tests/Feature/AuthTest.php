<?php

use App\Models\User;
use Inventorai\SDK\InventoraiClient;
use Inventorai\SDK\Resources\Properties;
use Inventorai\SDK\Resources\Inspections;

test('guest is redirected to login', function () {
    $this->get('/dashboard')->assertRedirect('/login');
    $this->get('/properties')->assertRedirect('/login');
    $this->get('/inspections')->assertRedirect('/login');
    $this->get('/settings')->assertRedirect('/login');
});

test('login page renders', function () {
    $this->get('/login')->assertOk();
});

test('register page renders', function () {
    $this->get('/register')->assertOk();
});

test('authenticated user can access dashboard', function () {
    $properties = mock(Properties::class);
    $properties->shouldReceive('list')->andReturn([
        'data' => [],
        'meta' => ['total' => 0],
    ]);

    $inspections = mock(Inspections::class);
    $inspections->shouldReceive('list')->andReturn([
        'data' => [],
        'meta' => ['total' => 0],
    ]);

    $client = mock(InventoraiClient::class);
    $client->shouldReceive('properties')->andReturn($properties);
    $client->shouldReceive('inspections')->andReturn($inspections);
    app()->instance(InventoraiClient::class, $client);

    $this->actingAs(User::factory()->create())
        ->get('/dashboard')
        ->assertOk();
});

test('authenticated user can access profile', function () {
    $this->actingAs(User::factory()->create())
        ->get('/profile')
        ->assertOk();
});
