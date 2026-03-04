#!/bin/bash
# ============================================================
# KLARPAKKE RLS POLICY FIX SCRIPT
# Fikser alle slow RLS policies (auth.uid() → (SELECT auth.uid()))
# ============================================================

set -e

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_REF="vuxbjlykgmzskxbclquf"
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_NAME="postgres"
DB_USER="postgres"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     KLARPAKKE RLS POLICY FIX                                 ║"
echo "║     Optimizes auth.uid() → (SELECT auth.uid())               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Sjekk om PGPASSWORD er satt
if [ -z "$PGPASSWORD" ]; then
    echo -e "${YELLOW}⚠️  PGPASSWORD er ikke satt${NC}"
    echo ""
    echo "For å bruke automatisk fix:"
    echo "1. Gå til: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"
    echo "2. Under 'Connection String', velg 'URI'"
    echo "3. Klikk 'Show Password'"
    echo "4. Kjør: export PGPASSWORD='ditt-passord'"
    echo "5. Kjør dette scriptet igjen"
    echo ""
    echo "Alternativ: Kjør SQL manuelt i SQL Editor:"
    echo "https://supabase.com/dashboard/project/${PROJECT_REF}/sql"
    echo ""
    echo "SQL-fil: ${SCRIPT_DIR}/RLS_FIX_COMPLETE.sql"
    exit 1
fi

echo -e "${GREEN}✅ PGPASSWORD er satt${NC}"
echo ""

# Test connection
echo -e "${CYAN}Tester database-tilkobling...${NC}"
if ! psql "postgresql://${DB_USER}:${PGPASSWORD}@${DB_HOST}:5432/${DB_NAME}" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Kunne ikke koble til database${NC}"
    echo "Sjekk at PGPASSWORD er korrekt"
    exit 1
fi
echo -e "${GREEN}✅ Tilkobling OK${NC}"
echo ""

# Kjør SQL
echo -e "${CYAN}Kjører RLS fix...${NC}"
echo ""

psql "postgresql://${DB_USER}:${PGPASSWORD}@${DB_HOST}:5432/${DB_NAME}" \
    -f "${SCRIPT_DIR}/RLS_FIX_COMPLETE.sql" \
    --pset="pager=off" \
    --pset="format=aligned"

echo ""
echo -e "${GREEN}✅ Script fullført!${NC}"
echo ""
echo "Verifiser resultatet i output over."
