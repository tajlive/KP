#!/bin/bash
# SQL Runner for Klarpakke
# Usage: ./sql.sh [command] [args]
#
# Laster DATABASE_URL og valgfri DATABASE_URL_MIGRATION fra:
#   .env, .env.local, .env.development.local, klarpakke-mcp-server/.env (siste vinner).
# psql bruker DATABASE_URL_MIGRATION når satt (Supabase direkte 5432 — anbefalt for DDL).
#
# Alltid repo-root som cwd (slik at .env.local finnes selv om du kjører scriptet fra annen mappe).

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Akkumuleres på tvers av filer (siste fil vinner per nøkkel)
_KLARP_PG_NONPOOL=""
_KLARP_PG_POOL=""
_KLARP_SUPABASE_DB=""

# Les KEY=value / export KEY=value (støtter mellomrom rundt =). Ignorerer tomme verdier.
load_env_kv() {
  local f="$1"
  [ -f "$f" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%%#*}"
    line="${line#"${line%%[![:space:]]*}"}"
    [ -z "$line" ] && continue
    if [[ "$line" =~ ^[Ee][Xx][Pp][Oo][Rr][Tt][[:space:]]+(.+)$ ]]; then
      line="${BASH_REMATCH[1]}"
      line="${line#"${line%%[![:space:]]*}"}"
    fi
    local key val
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=[[:space:]]*(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      val="${BASH_REMATCH[2]}"
    else
      continue
    fi
    val="${val%$'\r'}"
    if [[ "$val" == \"*\" ]]; then val="${val#\"}"; val="${val%\"}"; fi
    if [[ "$val" == \'*\' ]]; then val="${val#\'}"; val="${val%\'}"; fi
    [ -z "$val" ] && continue
    case "$key" in
      DATABASE_URL_MIGRATION) export DATABASE_URL_MIGRATION="$val" ;;
      DATABASE_URL) export DATABASE_URL="$val" ;;
      POSTGRES_URL_NON_POOLING|DIRECT_URL) _KLARP_PG_NONPOOL="$val" ;;
      POSTGRES_URL|POSTGRES_PRISMA_URL) _KLARP_PG_POOL="$val" ;;
      SUPABASE_DB_URL) _KLARP_SUPABASE_DB="$val" ;;
    esac
  done < "$f"
}

for _envf in .env .env.local .env.development.local klarpakke-mcp-server/.env; do
  load_env_kv "$_envf"
done

# Rekkefølge: eksplisitt migrasjon → DATABASE_URL → Vercel direkte → pool → Supabase DB
if [ -n "$DATABASE_URL_MIGRATION" ]; then
  PSQL_URL="$DATABASE_URL_MIGRATION"
elif [ -n "$DATABASE_URL" ]; then
  PSQL_URL="$DATABASE_URL"
elif [ -n "$_KLARP_PG_NONPOOL" ]; then
  PSQL_URL="$_KLARP_PG_NONPOOL"
elif [ -n "$_KLARP_PG_POOL" ]; then
  PSQL_URL="$_KLARP_PG_POOL"
elif [ -n "$_KLARP_SUPABASE_DB" ]; then
  PSQL_URL="$_KLARP_SUPABASE_DB"
else
  PSQL_URL=""
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

command="${1:-help}"

if [ "$command" = "diagnose" ]; then
  echo -e "${YELLOW}Diagnose: database-URL for psql${NC}"
  echo ""
  for _envf in .env .env.local .env.development.local klarpakke-mcp-server/.env; do
    if [ -f "$_envf" ]; then
      echo -e "  ${GREEN}✓${NC} $_envf"
      if grep -qE '^[[:space:]]*(export[[:space:]]+)?(DATABASE_URL|DATABASE_URL_MIGRATION|POSTGRES_|DIRECT_URL|SUPABASE_DB_URL)' "$_envf" 2>/dev/null; then
        echo "      (ukommenterte DB-variabler — viser nøkkelnavn):"
        grep -nE '^[[:space:]]*(export[[:space:]]+)?(DATABASE_URL|DATABASE_URL_MIGRATION|POSTGRES_URL|POSTGRES_PRISMA_URL|POSTGRES_URL_NON_POOLING|DIRECT_URL|SUPABASE_DB_URL)=' "$_envf" 2>/dev/null | sed 's/=.*/=…/' || true
      else
        echo "      (ingen ukommentert DATABASE_* / POSTGRES_* / SUPABASE_DB_URL)"
      fi
    else
      echo -e "  ${RED}−${NC} $_envf (mangler)"
    fi
  done
  echo ""
  if [ -n "$PSQL_URL" ]; then
    masked=$(echo "$PSQL_URL" | sed -E 's#:([^:@/]+)@#:****@#; s#//([^:]+):([^@]+)@#//\1:****@#')
    echo -e "${GREEN}✅ PSQL_URL er satt:${NC} $masked"
  else
    echo -e "${RED}❌ Ingen URL etter parsing.${NC} Legg f.eks. DATABASE_URL_MIGRATION=postgresql://… i .env.local"
  fi
  exit 0
fi

if [ -z "$PSQL_URL" ] && [ "$command" != "help" ]; then
  echo "❌ Mangler DATABASE_URL (eller DATABASE_URL_MIGRATION / POSTGRES_URL / SUPABASE_DB_URL)."
  echo ""
  echo "   Supabase Dashboard → Project Settings → Database → Connection string → URI"
  echo "   Lim inn i .env.local (én linje):"
  echo "     DATABASE_URL_MIGRATION=postgresql://postgres.[ref]:[PASSWORD]@aws-0-....:5432/postgres"
  echo "   (port 5432 = direkte; anbefalt for psql og DDL.)"
  echo ""
  echo "   Kjør:  ./scripts/sql.sh diagnose"
  exit 1
fi

case "$command" in
    "check"|"test")
        echo -e "${YELLOW}Testing database connection...${NC}"
        if psql "$PSQL_URL" -c "SELECT version();" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Database connection OK${NC}"
            psql "$PSQL_URL" -c "SELECT version();" | head -1
        else
            echo -e "${RED}❌ Database connection failed${NC}"
            exit 1
        fi
        ;;

    "tables"|"list")
        echo -e "${YELLOW}Listing all tables...${NC}"
        psql "$PSQL_URL" -c "\dt" | grep -E "^ public"
        ;;

    "check-table")
        table="${2:-}"
        if [ -z "$table" ]; then
            echo "Usage: ./sql.sh check-table <table_name>"
            exit 1
        fi
        echo -e "${YELLOW}Checking table: $table${NC}"
        if psql "$PSQL_URL" -c "\dt $table" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Table '$table' exists${NC}"
            psql "$PSQL_URL" -c "\d $table"
        else
            echo -e "${RED}❌ Table '$table' not found${NC}"
            exit 1
        fi
        ;;

    "file"|"run")
        file="${2:-}"
        if [ -z "$file" ] || [ ! -f "$file" ]; then
            echo "Usage: ./sql.sh file <path_to_sql_file>"
            echo "File not found: $file"
            exit 1
        fi
        echo -e "${YELLOW}Running SQL file: $file${NC}"
        if psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "$file"; then
            echo -e "${GREEN}✅ SQL file executed successfully${NC}"
        else
            echo -e "${RED}❌ SQL file execution failed${NC}"
            exit 1
        fi
        ;;

    "query"|"q")
        query="${2:-}"
        if [ -z "$query" ]; then
            echo "Usage: ./sql.sh query \"SELECT * FROM table\""
            exit 1
        fi
        echo -e "${YELLOW}Running query...${NC}"
        psql "$PSQL_URL" -c "$query"
        ;;

    "columns")
        table="${2:-}"
        if [ -z "$table" ]; then
            echo "Usage: ./sql.sh columns <table_name>"
            exit 1
        fi
        echo -e "${YELLOW}Columns in table '$table':${NC}"
        psql "$PSQL_URL" -c "\d $table"
        ;;

    "migrate"|"m")
        echo -e "${YELLOW}Running pending migrations...${NC}"
        for file in supabase/migrations/*.sql; do
            echo "Processing: $(basename $file)"
            psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "$file" || echo "⚠️  Skipped (may already be applied)"
        done
        echo -e "${GREEN}✅ Migrations complete${NC}"
        ;;

    "backup")
        backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
        echo -e "${YELLOW}Creating backup: $backup_file${NC}"
        pg_dump "$PSQL_URL" > "$backup_file"
        echo -e "${GREEN}✅ Backup saved to: $backup_file${NC}"
        ;;

    "help"|*)
        cat << 'EOF'
╔════════════════════════════════════════════════════════════╗
║                  KLARPAKKE SQL TOOL                        ║
╚════════════════════════════════════════════════════════════╝

USAGE:
  ./sql.sh [command] [args]

COMMANDS:
  diagnose              Vis .env-filer og om DB-URL ble lest (krever ikke psql)
  check                 Test database connection
  tables                List all tables
  check-table <name>    Check if table exists
  columns <name>        Show table columns
  file <path>           Run SQL file
  query <sql>           Run SQL query
  migrate               Run all migration files
  backup                Create database backup

ENV (siste .env-fil vinner; psql-URL velges i denne rekkefølgen):
  DATABASE_URL_MIGRATION, DATABASE_URL
  POSTGRES_URL_NON_POOLING, DIRECT_URL (Vercel/Prisma direkte — ofte port 5432)
  POSTGRES_URL, POSTGRES_PRISMA_URL, SUPABASE_DB_URL

EXAMPLES:
  ./sql.sh diagnose
  ./sql.sh check
  ./sql.sh tables
  ./sql.sh check-table live_trades
  ./sql.sh columns profiles
  ./sql.sh file supabase/migrations/my_migration.sql
  ./sql.sh query "SELECT * FROM profiles LIMIT 5"
  ./sql.sh migrate
  ./sql.sh backup

EOF
        ;;
esac
