import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import ReactDOMServer from 'react-dom/server';
import { route as ziggyRoute } from 'ziggy-js';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createServer((page) =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        title: (title) => `${title} - ${appName}`,
        // See app.tsx: the module namespace is unwrapped to its default export.
        resolve: async (name) => {
            const page = await resolvePageComponent(
                `./Pages/${name}.tsx`,
                import.meta.glob<{ default: ResolvedComponent }>('./Pages/**/*.tsx'),
            );

            return page.default;
        },
        setup: ({ App, props }) => {
            // Ziggy reaches the browser through the @routes directive, which
            // never runs here. SSR gets the same helper off the page props.
            const ziggy = (page.props as any).ziggy;

            globalThis.route = ((name: any, params: any, absolute: any) =>
                ziggyRoute(name, params, absolute, {
                    ...ziggy,
                    location: new URL(ziggy.location),
                })) as typeof ziggyRoute;

            return <App {...props} />;
        },
    }),
);
