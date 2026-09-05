import {
    createContext,
    useContext,
    useEffect,
    useId,
    useMemo,
    useRef,
    type ReactNode,
} from 'react';
import { router } from '@inertiajs/react';

type Registry = {
    set: (id: string, count: number) => void;
    remove: (id: string) => void;
};

const UnsavedSources = createContext<Registry | null>(null);

/**
 * Whether an Inertia visit is actually leaving this page.
 *
 * Most visits are not: every save on this page is a visit, hovering a
 * prefetching link is a visit, and so is the reload the Echo listener fires
 * when someone else uploads a photo. None of those lose anything.
 */
export function leavesPage(
    visit: { method: string; prefetch?: boolean; url: { href: string } },
    currentHref: string,
): boolean {
    if (visit.method !== 'get') {
        return false;
    }
    if (visit.prefetch) {
        return false;
    }

    return visit.url.href !== currentHref;
}

/**
 * Warns before unsaved edits are thrown away.
 *
 * Nothing on the inspection page saves as you type, and the edits are spread
 * across the area/item tree plus four cards, so the page collects what each
 * part is holding rather than trying to know about them itself: the page wraps
 * its content in <UnsavedGuard>, and anything with pending edits registers a
 * count with useUnsavedSource().
 *
 * Two different exits need covering. A real page unload — tab close, reload,
 * a link out of the app — is only visible to `beforeunload`. An Inertia visit
 * never unloads the page at all, so it needs the router's own `before` event.
 *
 * @param own the guarding page's own dirty count. It cannot arrive through
 *            useUnsavedSource: a component never reads the context it renders
 *            itself, so the page passes its count in directly.
 */
export function UnsavedGuard({
    own = 0,
    children,
}: {
    own?: number;
    children: ReactNode;
}) {
    const sources = useRef(new Map<string, number>());

    // Counts are read inside event handlers registered once on mount, so the
    // latest value has to be reachable through a ref rather than a closure.
    const ownCount = useRef(own);
    ownCount.current = own;

    const registry = useMemo<Registry>(
        () => ({
            set: (id, count) => {
                sources.current.set(id, count);
            },
            remove: (id) => {
                sources.current.delete(id);
            },
        }),
        [],
    );

    useEffect(() => {
        const total = () =>
            ownCount.current +
            [...sources.current.values()].reduce((sum, count) => sum + count, 0);

        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            if (total() === 0) {
                return;
            }
            // preventDefault is what asks for the prompt in current browsers;
            // the legacy path needs a non-empty returnValue. Browsers show
            // their own wording either way and ignore this string.
            event.preventDefault();
            event.returnValue = 'You have unsaved changes.';
        };

        window.addEventListener('beforeunload', onBeforeUnload);

        const stopRouterGuard = router.on('before', (event) => {
            const count = total();
            if (count === 0 || !leavesPage(event.detail.visit, window.location.href)) {
                return;
            }

            // Returning false cancels the visit and keeps the user here.
            return window.confirm(
                count === 1
                    ? 'You have one unsaved change on this page. Leave and lose it?'
                    : `You have ${count} unsaved changes on this page. Leave and lose them?`,
            );
        });

        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
            stopRouterGuard();
        };
    }, []);

    return <UnsavedSources.Provider value={registry}>{children}</UnsavedSources.Provider>;
}

/**
 * Registers one part of the page's unsaved count with the guard above.
 *
 * Does nothing when no guard is present, so a card stays usable on its own.
 */
export function useUnsavedSource(count: number): void {
    const registry = useContext(UnsavedSources);
    const id = useId();

    useEffect(() => {
        registry?.set(id, count);
    }, [registry, id, count]);

    useEffect(() => () => registry?.remove(id), [registry, id]);
}
