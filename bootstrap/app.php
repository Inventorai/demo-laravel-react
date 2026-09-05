<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        /**
         * Handle Inventorai SDK exceptions globally.
         *
         * Flashes the error to the session and redirects back. For Inertia
         * requests this triggers a flash message in the layout. Uses the
         * fallback URL /dashboard to avoid redirect loops when the error
         * occurs on the first page load after login (where back() would
         * send you to /login, creating an infinite loop).
         */
        $exceptions->renderable(function (\Inventorai\SDK\Exceptions\AuthenticationException $e, \Illuminate\Http\Request $request) {
            return redirect()->to(url()->previous('/dashboard'))
                ->with('error', 'Inventorai API authentication failed. Check your API token in Settings.');
        });

        $exceptions->renderable(function (\Inventorai\SDK\Exceptions\RateLimitException $e, \Illuminate\Http\Request $request) {
            return redirect()->to(url()->previous('/dashboard'))
                ->with('error', 'Inventorai API rate limit exceeded. Please wait and try again.');
        });

        $exceptions->renderable(function (\Inventorai\SDK\Exceptions\ApiException $e, \Illuminate\Http\Request $request) {
            // If the error is on the dashboard itself, render it directly to avoid a loop
            if ($request->routeIs('dashboard')) {
                session()->flash('error', 'Inventorai API error: ' . $e->getMessage());

                return \Inertia\Inertia::render('Dashboard', [
                    'stats' => ['totalProperties' => 0, 'totalInspections' => 0, 'completedInspections' => 0, 'inProgressInspections' => 0],
                    'charts' => ['propertyTypes' => [], 'inspectionTypes' => [], 'inspectionStatuses' => []],
                ]);
            }

            return redirect()->to(url()->previous('/dashboard'))
                ->with('error', 'Inventorai API error: ' . $e->getMessage());
        });
    })->create();
