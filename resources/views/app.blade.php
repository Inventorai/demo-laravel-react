<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Apply the saved theme before first paint to avoid a flash of the wrong mode --}}
        <script>
            (function () {
                try {
                    var pref = localStorage.getItem('color-scheme');
                    var isDark = pref === 'dark' || ((!pref || pref === 'auto') && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    document.documentElement.classList.toggle('dark', isDark);
                } catch (e) {}
            })();
        </script>

        <title data-inertia>{{ config('app.name', 'Laravel') }}</title>

        <link rel="icon" type="image/svg+xml" href="/images/logo/app_logo.svg">
        <link rel="icon" type="image/png" href="/favicon.png">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
