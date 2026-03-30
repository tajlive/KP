#!/bin/bash
# ============================================================================
# Setup Test Trader Script
# ============================================================================
# Oppretter test.trader.lowrisk@klarpakke.no med:
# - Low risk profil (forsiktig)
# - Paper trading session med 100k NOK
# - Beta user rolle
#
# Bruk:
#   npm run db:setup-test-trader
#   eller
#   ./scripts/setup-test-trader.sh
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/setup-test-trader.sql"

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================================================"
echo "Setup Test Trader: test.trader.lowrisk@klarpakke.no"
echo "========================================================================"

# Sjekk at SQL-fil finnes
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}FEIL: SQL-fil ikke funnet: $SQL_FILE${NC}"
    exit 1
fi

# Hent DATABASE_URL fra miljø
if [ -z "$DATABASE_URL" ]; then
    # Prøv å laste fra .env.local
    if [ -f ".env.local" ]; then
        export $(grep -E '^DATABASE_URL=' .env.local | xargs)
    fi
    
    # Prøv Supabase direktekobling
    if [ -z "$DATABASE_URL" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        # Bygg URL fra Supabase env vars
        if [ -n "$SUPABASE_URL" ]; then
            # Extract project ref from URL
            PROJECT_REF=$(echo "$SUPABASE_URL" | sed -E 's/.*\/\/([^.]+).*/\1/')
            DATABASE_URL="postgresql://postgres:$SUPABASE_SERVICE_ROLE_KEY@db.$PROJECT_REF.supabase.co:5432/postgres"
        fi
    fi
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}ADVARSEL: DATABASE_URL ikke satt${NC}"
    echo "Prøver å hente fra Supabase CLI..."
    
    # Sjekk om supabase CLI er tilgjengelig
    if command -v supabase &> /dev/null; then
        echo "Henter connection string fra Supabase..."
        # Dette krever at brukeren er logget inn
        supabase projects list 2>/dev/null || true
    fi
    
    echo ""
    echo "Vennligst sett DATABASE_URL miljøvariabel:"
    echo "  export DATABASE_URL='postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres'"
    echo ""
    echo "Eller kjør med:"
    echo "  npm run db:setup-test-trader"
    exit 1
fi

echo ""
echo "Kobler til database..."
echo "SQL-fil: $SQL_FILE"
echo ""

# Kjør SQL
if psql "$DATABASE_URL" -f "$SQL_FILE" 2>&1; then
    echo ""
    echo -e "${GREEN}========================================================================${NC}"
    echo -e "${GREEN}SETUP FULLFØRT${NC}"
    echo -e "${GREEN}========================================================================${NC}"
    echo ""
    echo "Bruker:     test.trader.lowrisk@klarpakke.no"
    echo "Passord:    TestLowRisk123!"
    echo "Risk Level: Low (forsiktig)"
    echo "Saldo:      100,000 NOK (paper)"
    echo ""
    echo "Neste steg:"
    echo "  1. npm run dev"
    echo "  2. npm run test:e2e -- --grep @risk"
    echo ""
else
    echo ""
    echo -e "${RED}========================================================================${NC}"
    echo -e "${RED}FEIL: Kunne ikke kjøre SQL${NC}"
    echo -e "${RED}========================================================================${NC}"
    echo ""
    echo "Sjekk:"
    echo "  1. Er DATABASE_URL korrekt?"
    echo "  2. Har du tilgang til databasen?"
    echo "  3. Er psql installert?"
    echo ""
    exit 1
fi
