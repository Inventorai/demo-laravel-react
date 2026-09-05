<?php

namespace App\Services;

use App\Events\ApiRequestTracked;
use Illuminate\Support\Facades\Cache;

/**
 * Tracks Inventorai SDK API calls for the dashboard activity feed.
 *
 * Call track() around any SDK call to record what endpoint was hit,
 * how long it took, and whether it succeeded. The dashboard reads
 * this via recent() to display the activity table.
 *
 * Usage:
 *   ApiActivityTracker::track('GET', '/properties', function () {
 *       return Inventorai::properties()->list(['per_page' => 25]);
 *   });
 */
class ApiActivityTracker
{
    private const CACHE_KEY = 'api_activity';
    private const MAX_ENTRIES = 50;
    private const TTL = 3600;

    /**
     * Execute a callback and record it as an API activity entry.
     */
    public static function track(string $method, string $endpoint, callable $callback): mixed
    {
        $start = microtime(true);
        $status = 200;

        try {
            $result = $callback();
            return $result;
        } catch (\Throwable $e) {
            $status = $e->getCode() ?: 500;
            throw $e;
        } finally {
            $duration = round((microtime(true) - $start) * 1000);

            $entry = [
                'method' => $method,
                'endpoint' => $endpoint,
                'status' => $status,
                'duration_ms' => $duration,
                'time' => now()->format('H:i:s'),
                'timestamp' => now()->toIso8601String(),
            ];

            $activity = Cache::get(self::CACHE_KEY, []);
            array_unshift($activity, $entry);
            Cache::put(self::CACHE_KEY, array_slice($activity, 0, self::MAX_ENTRIES), self::TTL);

            // Broadcast for real-time dashboard updates
            event(new ApiRequestTracked(
                method: $method,
                endpoint: $endpoint,
                status: (int) $status,
                duration_ms: (int) $duration,
                time: $entry['time'],
                timestamp: $entry['timestamp'],
            ));
        }
    }

    /**
     * Get recent API activity entries.
     *
     * @return list<array<string, mixed>>
     */
    public static function recent(int $limit = 50): array
    {
        /** @var list<array<string, mixed>> $activity */
        $activity = Cache::get(self::CACHE_KEY, []);

        return array_slice($activity, 0, $limit);
    }

    /**
     * Get aggregated stats from recent activity.
     *
     * @return array<string, mixed>
     */
    public static function stats(): array
    {
        /** @var list<array<string, mixed>> $activity */
        $activity = Cache::get(self::CACHE_KEY, []);

        if (empty($activity)) {
            return [
                'total_requests' => 0,
                'avg_duration_ms' => 0,
                'success_rate' => 100,
                'by_endpoint' => [],
            ];
        }

        $total = count($activity);
        $avgDuration = round(collect($activity)->avg('duration_ms'));
        $successCount = collect($activity)->where('status', '<', 400)->count();
        $byEndpoint = collect($activity)
            ->groupBy('endpoint')
            ->map(fn ($items, $endpoint) => [
                'endpoint' => $endpoint,
                'count' => $items->count(),
                'avg_ms' => round($items->avg('duration_ms')),
            ])
            ->sortByDesc('count')
            ->values()
            ->all();

        return [
            'total_requests' => $total,
            'avg_duration_ms' => $avgDuration,
            'success_rate' => round(($successCount / $total) * 100),
            'by_endpoint' => $byEndpoint,
        ];
    }
}
