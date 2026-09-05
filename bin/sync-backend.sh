#!/usr/bin/env bash
#
# Copies the shared Laravel backend from this repo (the Vue demo, which is the
# source of truth) into the React demo.
#
# The two demos are the same application behind two frontends: every PHP file,
# route, config and test is identical, and only the frontend stack diverges.
# Rather than trusting anyone to remember that, backend changes are authored
# here and pushed across with this script.
#
#   ./bin/sync-backend.sh              # sync into ../InventoraiSdkDemoReact
#   ./bin/sync-backend.sh --check      # report drift, change nothing (CI)
#   ./bin/sync-backend.sh --to <path>  # sync somewhere else
#
# Only git-tracked files are considered, so .env, vendor/ and node_modules/
# can never leak across.

set -euo pipefail

# Everything that legitimately differs between the two stacks. These are the
# only files either repo may disagree on; anything else drifting is a bug.
DIVERGENT=(
    'resources/js/'
    'resources/views/app.blade.php'
    'package.json'
    'package-lock.json'
    'vite.config.js'
    'tsconfig.json'
    'components.json'
    'README.md'
)

SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$SOURCE/../InventoraiSdkDemoReact"
CHECK=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --check) CHECK=1; shift ;;
        --to)    TARGET="$2"; shift 2 ;;
        *) echo "unknown argument: $1" >&2; exit 2 ;;
    esac
done

if [[ ! -d "$TARGET" ]]; then
    echo "target repo not found: $TARGET" >&2
    exit 2
fi
TARGET="$(cd "$TARGET" && pwd)"

cd "$SOURCE"

# This script is itself part of the synced set, so it also lands in the React
# repo. Sync only ever runs Vue -> React; refuse to run it the other way.
if [[ ! -f "$SOURCE/resources/js/app.ts" ]]; then
    echo "sync-backend.sh must be run from the Vue demo (the source of truth)." >&2
    echo "  found: $SOURCE" >&2
    exit 2
fi

# git ls-files is the allowlist: tracked, and not stack-specific.
FILES="$(mktemp)"
EXCLUDES="$(mktemp)"
trap 'rm -f "$FILES" "$EXCLUDES"' EXIT
printf '%s\n' "${DIVERGENT[@]}" > "$EXCLUDES"
git ls-files | grep -vFf "$EXCLUDES" > "$FILES"

# --checksum compares contents, but rsync still itemizes timestamp-only
# differences, and this script treats any itemized line as drift. -t carries
# file mtimes across so a synced file matches on the next --check, and
# --omit-dir-times ignores directory mtimes, which shift whenever anything in
# them is written and would otherwise fail CI on every run.
RSYNC_ARGS=(--files-from="$FILES" --checksum -t --omit-dir-times "$SOURCE/" "$TARGET/")

if [[ $CHECK -eq 1 ]]; then
    DRIFT="$(rsync --dry-run --itemize-changes "${RSYNC_ARGS[@]}")"
    if [[ -n "$DRIFT" ]]; then
        echo "Backend drift between the Vue and React demos:" >&2
        echo "$DRIFT" >&2
        echo >&2
        echo "Run ./bin/sync-backend.sh from the Vue repo to resolve." >&2
        exit 1
    fi
    echo "✓ backends are in sync ($(wc -l < "$FILES" | tr -d ' ') shared files)"
    exit 0
fi

CHANGED="$(rsync --itemize-changes "${RSYNC_ARGS[@]}")"
if [[ -n "$CHANGED" ]]; then echo "$CHANGED"; fi
echo "✓ synced $(wc -l < "$FILES" | tr -d ' ') shared files into $TARGET"

# composer.json and composer.lock are shared, so a dependency bump authored here
# lands in the React repo as a lock file with no matching vendor/. Nothing else
# would catch that: vendor/ is untracked, so --check would still call the two in
# sync while React ran against the old code. Install it now instead.
if grep -q 'composer\.lock' <<< "$CHANGED"; then
    echo "composer.lock changed — running composer install in $TARGET"
    (cd "$TARGET" && composer install --no-interaction)
fi
