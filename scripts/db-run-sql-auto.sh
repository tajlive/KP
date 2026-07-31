#!/bin/bash
set -euo pipefail

# Farger for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "🔄 KJØRER SQL MOT SUPABASE (AUTOMATISK)"
echo "========================================"
echo ""

# Last inn .env.local (robust loader — tåler '&' i URL-er)
if [ ! -f .env.local ]; then
  echo -e "${RED}[ERROR]${NC} .env.local ikke funnet!"
  exit 1
fi

# shellcheck source=lib/load-env.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib/load-env.sh"

# Hent database connection string
DB_URL="${DATABASE_URL:-}"
if [ -z "$DB_URL" ]; then
  echo -e "${RED}[ERROR]${NC} DATABASE_URL ikke satt i .env.local"
  echo "Legg til: DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
  exit 1
fi

# Sjekk om psql er installert
if ! command -v psql &> /dev/null; then
  echo -e "${RED}[ERROR]${NC} psql ikke installert"
  echo "Installer med: brew install postgresql"
  exit 1
fi

# Sjekk om SQL-fil eksisterer
SQL_FILE="${1:-supabase/migrations/20260210_courses_system.sql}"
if [ ! -f "$SQL_FILE" ]; then
  echo -e "${RED}[ERROR]${NC} Finner ikke $SQL_FILE"
  exit 1
fi

echo -e "${GREEN}[INFO]${NC} Kjører SQL fra: $SQL_FILE"
echo -e "${GREEN}[INFO]${NC} Mot database: ${DB_URL%%:*}:***@***"
echo ""

# Kjør SQL
psql "$DB_URL" -f "$SQL_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ SQL KJØRT SUKSESSFULLT!${NC}"
  echo ""
  
  # Verifiser at courses eksisterer
  echo "🔍 Verifiserer at courses-tabell eksisterer..."
  COURSE_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM courses;" 2>/dev/null || echo "0")
  
  if [ "$COURSE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Fant $COURSE_COUNT kurs i databasen${NC}"
  else
    echo -e "${YELLOW}⚠️  courses-tabell er tom eller finnes ikke${NC}"
  fi
else
  echo ""
  echo -e "${RED}❌ SQL FEILET!${NC}"
  exit 1
fi

echo ""
