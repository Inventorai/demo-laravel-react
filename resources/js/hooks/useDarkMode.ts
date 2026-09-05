import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'color-scheme';

/**
 * Dark mode backed by localStorage, matching the inline script in app.blade.php.
 *
 * That script runs before first paint so the page never flashes the wrong
 * theme; this hook has to agree with it on both the storage key and how a
 * missing preference is read, or the two would disagree on the first render.
 */
function prefers(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
        return stored === 'dark';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useDarkMode(): [boolean, () => void] {
    // Server-rendered markup has no localStorage, so it always renders the
    // light branch. Starting at false here keeps hydration from mismatching;
    // the effect below corrects it immediately on the client.
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        setIsDark(prefers());
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
    }, [isDark]);

    const toggle = useCallback(() => {
        setIsDark((current) => {
            const next = !current;
            window.localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
            return next;
        });
    }, []);

    return [isDark, toggle];
}
