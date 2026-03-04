#!/usr/bin/env bash
set -euo pipefail

echo "=== VERIFY SUPABASE ==="

WORKDIR="$HOME/klarpakke"
ENVFILE="$WORKDIR/.env.local"

echo "Arbeider i: $WORKDIR"
cd "$WORKDIR"

if [ ! -f "$ENVFILE" ]; then
  echo "Feil: $ENVFILE finnes ikke."
  exit 3
fi

eval "$(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENVFILE" | sed 's/^/export /')"

echo "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-<mangler>}"
echo "DATABASE_URL=${DATABASE_URL:-<mangler>}"

if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ] || [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Mangler Supabase-variabler i .env.local"
  exit 1
fi

if command -v psql >/dev/null 2>&1; then
  echo "Tester DB-tilkobling (SELECT now())..."
  psql "$DATABASE_URL" -Atc "SELECT now();" | head -1
  echo "✅ DB-tilkobling OK"
else
  echo "⚠️ psql ikke installert, hopper over DB-test"
fi

echo "=== VERIFY SUPABASE DONE ==="
