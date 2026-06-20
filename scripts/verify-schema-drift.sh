#!/usr/bin/env bash
# Verifiserer at produksjonsskjemaet samsvarer med ein fresh supabase db reset.
# Bruk: ./scripts/verify-schema-drift.sh [POSTGRES_URL]
# Krev: pg_dump, supabase CLI, diff, sed, sort

set -euo pipefail

PROD_URL="${1:-${POSTGRES_URL:-}}"
if [ -z "$PROD_URL" ]; then
  echo "❌ Manglar POSTGRES_URL. Bruk: $0 <POSTGRES_URL> eller export POSTGRES_URL="
  exit 1
fi

LOCAL_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@localhost:54322/postgres}"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

# Normaliserer ein schema-dump til samanlikningsformat.
# Fjerner variable delar som owner, privileges, tidsstempel og sorterer.
normalize_schema() {
  local input="$1"
  local output="$2"
  sed -E \
    -e 's/OWNER TO [^;]+/OWNER TO ___owner___/g' \
    -e 's/[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}/___timestamp___/g' \
    -e 's/SET default_table_access_method.*/SET default_table_access_method = ___;/g' \
    -e '/^--/d' \
    -e '/^$/d' \
    "$input" | sort > "$output"
}

echo "🔍 Henter produksjonsskjema..."
pg_dump --schema-only --no-owner --no-privileges "$PROD_URL" > "$TMP_DIR/prod-schema.sql"

echo "🔁 Kjører supabase db reset..."
supabase db reset --no-seed-data

echo "🔍 Henter fresh lokalt skjema..."
pg_dump --schema-only --no-owner --no-privileges "$LOCAL_URL" > "$TMP_DIR/fresh-schema.sql"

echo "🧹 Normaliserer dumpene..."
normalize_schema "$TMP_DIR/prod-schema.sql" "$TMP_DIR/prod-normalized.sql"
normalize_schema "$TMP_DIR/fresh-schema.sql" "$TMP_DIR/fresh-normalized.sql"

echo "📊 Genererer diff..."
if diff -u "$TMP_DIR/prod-normalized.sql" "$TMP_DIR/fresh-normalized.sql" > "$TMP_DIR/schema-drift.diff"; then
  echo "✅ Ingen skjemadrift funnen."
  exit 0
else
  echo "⚠️  Skjemadrift oppdaga."
  echo "--- første 80 linjer (normalisert diff) ---"
  head -80 "$TMP_DIR/schema-drift.diff"
  echo ""
  echo "Full diff: $TMP_DIR/schema-drift.diff"
  exit 1
fi
