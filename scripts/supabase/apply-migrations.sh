#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "Mangler SUPABASE_DB_URL (postgres connection string)."
  exit 1
fi

if command -v supabase >/dev/null 2>&1; then
  set +e
  supabase db push --db-url "$SUPABASE_DB_URL"
  rc=$?
  set -e
  if [[ $rc -eq 0 ]]; then
    echo "OK: supabase db push"
    exit 0
  fi
  echo "Supabase CLI db push feilet (rc=$rc). Faller tilbake til psql."
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Mangler psql (brew install libpq && brew link --force libpq)"
  exit 1
fi

if [[ -d "supabase/migrations" ]]; then
  find supabase/migrations -maxdepth 1 -type f -name "*.sql" | sort | while read -r f; do
    echo "-> $f"
    psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$f"
  done
fi

if [[ -d "db/migrations" ]]; then
  find db/migrations -maxdepth 1 -type f -name "*.sql" | sort | while read -r f; do
    echo "-> $f"
    psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$f"
  done
fi
