<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;

/**
 * Proxies broadcasting auth requests to the Inventorai API.
 *
 * The frontend Echo client hits this endpoint instead of the API directly,
 * so the API token never leaves the server. This controller forwards
 * the auth request with the token attached server-side.
 */
class BroadcastingAuthController extends Controller
{
    public function auth(Request $request): Response
    {
        $response = Http::withToken(config('inventorai.token'))
            ->acceptJson()
            ->post(config('inventorai.base_url') . '/broadcasting/auth', [
                'socket_id' => $request->input('socket_id'),
                'channel_name' => $request->input('channel_name'),
            ]);

        return response($response->body(), $response->status())
            ->header('Content-Type', 'application/json');
    }
}
