import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    // @unovis ships deep directory imports (e.g. '@unovis/ts/containers/xy-container').
    // Vite externalises dependencies in the SSR build, which hands those to Node's
    // ESM loader — and it rejects directory imports outright, so the Dashboard fails
    // to render server-side. Bundling the charts into the SSR output resolves them
    // with Vite's own resolver instead.
    ssr: {
        noExternal: ['@unovis/react', '@unovis/ts'],
    },
    server: {
        host: "inventoraisdkdemoreact.test",
        port: 5174,
        hmr: {
            host: "inventoraisdkdemoreact.test",
        },
        watch: {
            usePolling: true,
            ignored: [
                '**/node_modules/**',
                '**/.git/**',
                '**/vendor/**',
                '**/storage/**',
            ],
        },
    },
    plugins: [
        tailwindcss(),
        laravel({
            input: 'resources/js/app.tsx',
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react(),
    ],
});
