#!/usr/bin/env bash
# Push Supabase-migrasjoner til remote og regenerer TypeScript-typer.
# Bruk: npm run db:ship
# Krever: SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF (eller ID), eller supabase link lokalt.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REF="${SUPABASE_PROJECT_REF:-${SUPABASE_PROJECT_ID:-}}"

if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" && -n "$REF" ]]; then
  echo "db-ship: link + db push (project ref ${REF})"
  npx supabase link --project-ref "$REF"
  npx supabase db push
else
  echo "db-ship: db push --linked (ingen SUPABASE_ACCESS_TOKEN+REF i miljø)"
  supabase db push --linked
fi

echo "db-ship: npm run db:gen-types"
npm run db:gen-types

echo "db-ship: ferdig. Commit src/types/supabase-generated.ts hvis git diff viser endringer."
