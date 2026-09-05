# Inventorai Demo — Laravel + React

A working demo app showing how to integrate the [Inventorai Laravel SDK](https://github.com/Inventorai/sdk-laravel) into a Laravel + React (Inertia) application.

> Prefer Vue? The same app is available as [demo-laravel-vue](https://github.com/Inventorai/demo-laravel-vue). Both demos share an identical Laravel backend — only the frontend differs.

## What it demonstrates

- **Properties** — List and view properties with addresses, images, and map pins
- **Inspections** — Browse, filter, and edit inspections including areas, items, conditions, and cleanliness ratings
- **Photo uploads** — Upload photos to inspection areas and items via the SDK
- **Phrase autocomplete** — Search and select from pre-built phrase libraries when writing descriptions
- **Real-time updates** — Listen for changes via WebSockets (Reverb) so the UI stays in sync
- **API activity tracker** — See every SDK request in real time (method, endpoint, status, duration)
- **Dashboard** — Property and inspection stats with charts

## Requirements

- PHP 8.3+
- Node.js 18+
- Composer
- An [Inventorai](https://inventorai.co.uk) account with an API token

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/Inventorai/demo-laravel-react.git
cd demo-laravel-react
```

### 2. Install dependencies

```bash
composer install
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
php artisan key:generate
```

Open `.env` and add your API token:

```
INVENTORAI_API_TOKEN=your-token-here
```

You can generate a token from **Team Settings > API** in your [Inventorai dashboard](https://app.inventorai.co.uk).

### 4. Set up the database

The app uses SQLite by default — no database server needed.

```bash
touch database/database.sqlite
php artisan migrate
```

### 5. Create a user

```bash
php artisan tinker
> User::factory()->create(['name' => 'Test User', 'email' => 'test@example.com', 'password' => bcrypt('password')]);
```

### 6. Run the app

```bash
composer dev
```

This starts the Laravel server, queue worker, log watcher, and Vite dev server concurrently. Visit [http://localhost:8000](http://localhost:8000) and log in.

## Project structure

```
app/Http/Controllers/
├── DashboardController.php      # Stats and charts via SDK
├── PropertyController.php       # Property list and detail
├── InspectionController.php     # Inspection CRUD, photo uploads, phrase search
├── SettingsController.php       # API token configuration
└── BroadcastingAuthController.php  # Proxies WebSocket auth to Inventorai API

app/Services/
└── ApiActivityTracker.php       # Logs SDK requests for the activity feed

resources/js/
├── hooks/
│   ├── useDrafts.ts             # Editable copies of API records, saved on demand
│   └── useUnsavedGuard.tsx      # Warns before unsaved edits are discarded
└── Pages/
    ├── Dashboard.tsx
    ├── Properties/
    │   ├── Index.tsx
    │   └── Show.tsx
    ├── Inspections/
    │   ├── Index.tsx
    │   └── Show.tsx             # Editable areas/items, photo upload, phrase autocomplete
    └── Settings/
        └── Index.tsx
```

## Tech stack

- [Laravel 13](https://laravel.com) + [Inertia.js](https://inertiajs.com)
- [React 19](https://react.dev) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Inventorai Laravel SDK](https://github.com/Inventorai/sdk-laravel), built on the [Inventorai PHP SDK](https://github.com/Inventorai/sdk-php)

## Useful commands

| Command | Description |
|---|---|
| `composer dev` | Start all dev services |
| `composer test` | Run tests |
| `npm run build` | Build frontend for production |

## Keeping the backend in step with the Vue demo

The Laravel side of this app is a copy of the one in [demo-laravel-vue](https://github.com/Inventorai/demo-laravel-vue), which is where backend changes are authored. Everything outside `resources/js/`, `resources/views/app.blade.php` and the frontend build config is identical between the two.

From a checkout of the Vue demo:

```bash
./bin/sync-backend.sh              # push backend changes into this repo
./bin/sync-backend.sh --check      # report drift without changing anything
```

A `pre-push` hook in the Vue demo runs the `--check` form automatically and refuses
the push while the two have drifted, so the backends cannot quietly diverge.

## License

MIT
