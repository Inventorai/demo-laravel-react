<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Broadcast when an SDK API call is tracked.
 * Fires immediately (ShouldBroadcastNow) so the dashboard
 * updates in real-time without queue workers.
 */
class ApiRequestTracked implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public string $method,
        public string $endpoint,
        public int $status,
        public int $duration_ms,
        public string $time,
        public string $timestamp,
    ) {}

    public function broadcastOn(): array
    {
        $teamId = config('inventorai.team_id');

        return $teamId
            ? [new PrivateChannel("team.{$teamId}")]
            : [];
    }

    public function broadcastAs(): string
    {
        return 'api-request.tracked';
    }
}
