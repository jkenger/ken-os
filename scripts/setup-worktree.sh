#!/usr/bin/env bash
set -euo pipefail

WORKTREE_PATH="${1:-}"
SOURCE_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -z "$WORKTREE_PATH" ]; then
  echo "Usage: ./scripts/setup-worktree.sh <path>"
  exit 1
fi

if [ ! -d "$WORKTREE_PATH" ]; then
  echo "No directory at $WORKTREE_PATH. Create the worktree first with git worktree add."
  exit 1
fi

if [ ! -f "$SOURCE_PATH/apps/web/.env" ]; then
  echo "$SOURCE_PATH/apps/web/.env is missing. Set up the main checkout's env first (copy apps/web/.env.example)."
  exit 1
fi

cp "$SOURCE_PATH/apps/web/.env" "$WORKTREE_PATH/apps/web/.env"

cd "$WORKTREE_PATH"

pnpm install

# compose.yaml pins the project name to "ken-os-local" and a fixed host port,
# so this always reaches the one shared local Postgres container no matter
# which worktree runs it. Safe to call from every worktree.
pnpm db:up

# Give this worktree its own logical database on that shared container, so
# migrations and test data in one worktree can't collide with another.
# ken_os (from .env) stays the connection used to reach the server; the
# actual working database is this worktree's own.
RAW_NAME="$(basename "$WORKTREE_PATH")"
SLUG="$(echo "$RAW_NAME" | tr '[:upper:]' '[:lower:]' | sed -e 's/[^a-z0-9_]/_/g' -e 's/^ken[_-]os[_-]*//')"
DB_NAME="ken_os_${SLUG}"
DB_NAME="${DB_NAME:0:63}"

EXISTS="$(docker compose exec -T -e PGPASSWORD=password postgres \
  psql -U user -d ken_os -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | tr -d '[:space:]')"

if [ "$EXISTS" != "1" ]; then
  echo "Creating database $DB_NAME"
  docker compose exec -T -e PGPASSWORD=password postgres psql -U user -d ken_os -c "CREATE DATABASE \"$DB_NAME\""
else
  echo "Database $DB_NAME already exists"
fi

# .env.local loads before .env and wins (dotenv and Next.js both keep the
# first value they see), so this is the only file that needs the worktree's
# own DATABASE_URL. Everything else (API keys, OAuth client, etc.) still
# comes from the shared .env copied above.
ENV_LOCAL="apps/web/.env.local"
touch "$ENV_LOCAL"
grep -v '^DATABASE_URL=' "$ENV_LOCAL" > "$ENV_LOCAL.tmp" || true
mv "$ENV_LOCAL.tmp" "$ENV_LOCAL"
echo "DATABASE_URL=postgresql://user:password@localhost:5435/$DB_NAME" >> "$ENV_LOCAL"

pnpm db:migrate

echo "Worktree environment ready: $WORKTREE_PATH (database: $DB_NAME)"
