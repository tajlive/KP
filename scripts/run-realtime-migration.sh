#!/usr/bin/env bash
# Kjør Realtime-publikasjon-migrasjon (trading_sessions, trades, notifications, user_profiles, beta_signups).
# Krever: DATABASE_URL i miljø eller .env.local (postgresql://...)
# Bruk: ./scripts/run-realtime-migration.sh
# Alternativ: Supabase Dashboard → SQL Editor, lim inn innholdet i supabase/migrations/20260317180000_enable_realtime_core_tables.sql

set -e
cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  set -a
  # shellcheck source=/dev/null
  . .env.local
  set +a
fi

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL er ikke satt. Sett den i .env.local eller eksporter før du kjører dette skriptet."
  echo "Eksempel: DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres"
  exit 1
fi

echo "Kjører Realtime-migrasjon mot databasen..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260317180000_enable_realtime_core_tables.sql
echo "Ferdig."
