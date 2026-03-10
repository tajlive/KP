#!/usr/bin/env bash
# scripts/dump-schema.sh
# Dumper Klarpakke DB-skjema til docs/database-schema.md
# Bruk: bash scripts/dump-schema.sh
# Del docs/database-schema.md med KIMI/Perplexity for full DB-kontekst

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

OUTPUT="docs/database-schema.md"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

mkdir -p docs

# Last env
for env_file in .env.local; do
  if [ -f "$env_file" ]; then
    while IFS='=' read -r key value; do
      [[ "$key" =~ ^[[:space:]]*# ]] && continue
      [[ -z "$key" ]] && continue
      value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
      export "$key=$value"
    done < <(grep -E '^(DATABASE|POSTGRES|SUPABASE)' "$env_file" 2>/dev/null || true)
  fi
done

# Fallback
if [ -z "${DATABASE_URL:-}" ] && [ -n "${POSTGRES_URL:-}" ]; then
  export DATABASE_URL="$POSTGRES_URL"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo -e "${RED}❌ DATABASE_URL mangler i .env.local${NC}"
  echo "Legg til: DATABASE_URL=postgresql://postgres.[ref]:[pass]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres"
  exit 1
fi

echo -e "${YELLOW}⏳ Henter skjema fra Supabase...${NC}"

cat > "$OUTPUT" << EOF
# Klarpakke Database Schema
> Auto-generert: $TIMESTAMP  
> Prosjekt: vuxbjlykgmzskxbclquf  
> Bruk denne filen som kontekst til KIMI / Perplexity / Claude

---

EOF

# Tabelloversikt
echo '## Tabeller (oversikt)' >> "$OUTPUT"
echo '' >> "$OUTPUT"
echo '| Tabell | RLS | Rader (estimert) |' >> "$OUTPUT"
echo '|--------|-----|-----------------|' >> "$OUTPUT"

psql "$DATABASE_URL" -t -A -F'|' << 'SQL' >> "$OUTPUT"
SELECT 
  '| ' || t.tablename || ' | ' || 
  CASE WHEN t.rowsecurity THEN '✅' ELSE '❌' END || ' | ' ||
  COALESCE(c.reltuples::bigint::text, '?') || ' |'
FROM pg_tables t
LEFT JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
ORDER BY t.tablename;
SQL

echo '' >> "$OUTPUT"

# Kolonner per tabell
echo '## Kolonner per tabell' >> "$OUTPUT"
echo '' >> "$OUTPUT"

psql "$DATABASE_URL" -t -A -F'|' << 'SQL' >> "$OUTPUT"
SELECT DISTINCT
  '### ' || table_name
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY 1;
SQL

# Full kolonne-detaljer
psql "$DATABASE_URL" << 'SQL' >> "$OUTPUT"
\pset format markdown
SELECT 
  table_name AS "Tabell",
  column_name AS "Kolonne",
  data_type AS "Type",
  is_nullable AS "Nullable",
  COALESCE(column_default, '') AS "Default"
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
SQL

# RLS Policies
echo '' >> "$OUTPUT"
echo '## RLS Policies' >> "$OUTPUT"
echo '' >> "$OUTPUT"

psql "$DATABASE_URL" << 'SQL' >> "$OUTPUT"
\pset format markdown
SELECT 
  tablename AS "Tabell",
  policyname AS "Policy",
  cmd AS "Kommando",
  roles AS "Roller"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
SQL

# Foreign keys
echo '' >> "$OUTPUT"
echo '## Foreign Keys' >> "$OUTPUT"
echo '' >> "$OUTPUT"

psql "$DATABASE_URL" << 'SQL' >> "$OUTPUT"
\pset format markdown
SELECT
  tc.table_name AS "Fra tabell",
  kcu.column_name AS "Kolonne",
  ccu.table_name AS "Til tabell",
  ccu.column_name AS "Til kolonne"
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
SQL

echo -e "${GREEN}✅ Schema lagret til: $OUTPUT${NC}"
echo ""
echo -e "${YELLOW}📋 Neste steg:${NC}"
echo "  1. Kopier innholdet i $OUTPUT"
echo "  2. Lim inn i KIMI / Perplexity / Claude som kontekst"
echo "  3. AI-en har nå full DB-oversikt uten psql-tilgang"
echo ""
wc -l "$OUTPUT" | awk '{print "   Skjemafil: " $1 " linjer"}'
