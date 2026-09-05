import { useEffect, useMemo, useRef } from 'react';

/**
 * Calls `fn` only once the caller stops firing for `delay` ms.
 *
 * The callback is held in a ref so the debounced wrapper keeps a stable
 * identity across renders — otherwise every render would build a new timer
 * and nothing would ever be debounced.
 */
export function useDebouncedCallback<A extends unknown[]>(
    fn: (...args: A) => void,
    delay: number,
): (...args: A) => void {
    const callback = useRef(fn);
    callback.current = fn;

    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (timer.current) {
            clearTimeout(timer.current);
        }
    }, []);

    return useMemo(
        () =>
            (...args: A) => {
                if (timer.current) {
                    clearTimeout(timer.current);
                }
                timer.current = setTimeout(() => callback.current(...args), delay);
            },
        [delay],
    );
}
