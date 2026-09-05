import '../css/app.css';
import './bootstrap';

import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot, hydrateRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    // The glob hands back a whole module namespace, but Inertia's resolver
    // types accept a component or a promise of one — not a promise of a
    // module — so the default export is unwrapped here.
    resolve: async (name) => {
        const page = await resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob<{ default: ResolvedComponent }>('./Pages/**/*.tsx'),
        );

        return page.default;
    },
    setup({ el, App, props }) {
        // The server pre-renders through ssr.tsx, so an existing markup tree
        // must be hydrated rather than thrown away and re-rendered.
        if (el.hasChildNodes()) {
            hydrateRoot(el, <App {...props} />);
            return;
        }

        createRoot(el).render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});
