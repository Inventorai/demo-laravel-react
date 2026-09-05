import Echo from 'laravel-echo';

let echo: Echo<'reverb'> | null = null;

/**
  * Creates a singleton Echo instance connected to Inventorai's Reverb server.
 *
 * Connection config comes from the app's own Vite env (VITE_REVERB_*),
 * which mirror the REVERB_* values in .env — the same Reverb instance the
 * Inventorai API broadcasts on. No `token()` call is needed for this.
 *
 * Broadcasting auth is proxied through /broadcasting/auth so the Inventorai
 * API token never leaves the server.
 *
 * Returns null if Reverb is not configured (no VITE_REVERB_APP_KEY).
 */
export function getEcho(): Echo<'reverb'> | null {
    if (echo) {
        return echo;
    }

    const key = import.meta.env.VITE_REVERB_APP_KEY;
    if (!key) {
        return null;
    }

    const port = Number(import.meta.env.VITE_REVERB_PORT ?? 443);
    const scheme = import.meta.env.VITE_REVERB_SCHEME ?? 'https';

    echo = new Echo({
        broadcaster: 'reverb',
        key,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: port,
        wssPort: port,
        forceTLS: scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: '/broadcasting/auth',
    });

    window.Echo = echo;

    return echo;
}
