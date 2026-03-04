#!/bin/bash
# KLARPAKKE DATABASE SETUP SCRIPT
# Kjører alle SQL-migrasjoner mot Supabase

set -e

echo "🚀 Klarpakke Database Setup"
echo ""

# Farger
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Sjekk om .env.local finnes
if [ -f .env.local ]; then
    echo "📂 Loading environment from .env.local"
    export $(grep -v '^#' .env.local | xargs)
fi

# Database connection info
DB_HOST="db.vuxbjlykgmzskxbclquf.supabase.co"
DB_NAME="postgres"
DB_USER="postgres"
DB_PORT="5432"

# Hent passord fra SERVICE_KEY (bruker anon key som fallback)
DB_PASSWORD="${SUPABASE_SERVICE_ROLE_KEY:-$NEXT_PUBLIC_SUPABASE_ANON_KEY}"

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ ERROR: Database password not found${NC}"
    echo "Sett SUPABASE_SERVICE_ROLE_KEY i .env.local"
    exit 1
fi

echo "📡 Connecting to: $DB_HOST"
echo ""

# Sjekk om psql er installert
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  psql not found${NC}"
    echo ""
    echo "Please install PostgreSQL client:"
    echo "  macOS:   brew install libpq"
    echo "  Ubuntu:  sudo apt-get install postgresql-client"
    echo ""
    echo "Or run SQL manually in Supabase Dashboard:"
    echo "  https://app.supabase.com/project/vuxbjlykgmzskxbclquf/sql/new"
    exit 1
fi

# Kjør migrasjon
echo "📦 Running migrations..."
echo ""

psql \
    "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" \
    -f supabase/migrations/20240214_create_core_tables.sql \
    2>&1 | grep -E "(CREATE|INSERT|ERROR|already exists)" || true

echo ""
echo "🌱 Seeding data..."
echo ""

psql \
    "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" \
    -f supabase/seed.sql \
    2>&1 | grep -E "(INSERT|ERROR)" || true

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📊 Dashboard URLs:"
echo "   Direct: https://www.klarpakke.no/admin-dashboard.html"
echo "   Admin:  https://www.klarpakke.no/no/admin/v2"
echo ""
echo "🔍 Verify in Supabase:"
echo "   https://app.supabase.com/project/vuxbjlykgmzskxbclquf/editor"
