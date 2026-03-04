#!/bin/bash
# =============================================================================
# Klarpakke: Quick Setup for Supabase Cron
# Bruk: ./run-cron-setup.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          KLARPAKKE - SUPABASE CRON SETUP                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Hent CRON_SECRET fra .env.local
ENV_FILE="$PROJECT_ROOT/.env.local"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}✗ Feil: .env.local ikke funnet!${NC}"
    exit 1
fi

CRON_SECRET=$(grep "CRON_SECRET=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d '\n')

if [ -z "$CRON_SECRET" ]; then
    echo -e "${RED}✗ Feil: CRON_SECRET ikke funnet i .env.local!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ CRON_SECRET funnet${NC}"
echo ""

# Sjekk om SQL-fil allerede finnes med CRON_SECRET
EXISTING_SQL=$(find "$SCRIPT_DIR" -name "supabase-cron-ready-*.sql" -type f 2>/dev/null | head -1)

if [ -n "$EXISTING_SQL" ]; then
    echo -e "${YELLOW}Eksisterende SQL-fil funnet:${NC}"
    echo "  $EXISTING_SQL"
    echo ""
    read -p "Bruke eksisterende fil? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        SQL_FILE="$EXISTING_SQL"
    else
        SQL_FILE=""
    fi
fi

# Generer ny SQL-fil hvis nødvendig
if [ -z "$SQL_FILE" ]; then
    TEMPLATE="$SCRIPT_DIR/setup-supabase-cron.sql"
    if [ ! -f "$TEMPLATE" ]; then
        echo -e "${RED}✗ Feil: $TEMPLATE ikke funnet!${NC}"
        exit 1
    fi
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    SQL_FILE="$SCRIPT_DIR/supabase-cron-ready-${TIMESTAMP}.sql"
    
    # Erstatt placeholder med CRON_SECRET
    sed "s/DIN_CRON_SECRET_HER/$CRON_SECRET/g" "$TEMPLATE" > "$SQL_FILE"
    
    echo -e "${GREEN}✓ Ny SQL-fil generert:${NC}"
    echo "  $SQL_FILE"
fi

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  INSTRUKSJONER FOR SUPABASE DASHBOARD                      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}1. Åpne Supabase Dashboard:${NC}"
echo -e "   ${BLUE}https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf${NC}"
echo ""
echo -e "${YELLOW}2. Naviger til:${NC}"
echo "   SQL Editor → + New query"
echo ""
echo -e "${YELLOW}3. Kopier SQL fra filen:${NC}"
echo "   $SQL_FILE"
echo ""
echo -e "${YELLOW}4. Lim inn og kjør (Ctrl+Enter)${NC}"
echo ""
echo -e "${YELLOW}5. Verifiser resultatet:${NC}"
echo "   Du skal se 2 rader:"
echo "   • klarpakke-trading-tick (schedule: * * * * *)"
echo "   • klarpakke-trading-recover (schedule: */5 * * * *)"
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  ALTERNATIV: Direkte via Supabase CLI                      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  supabase sql --project-ref vuxbjlykgmzskxbclquf < $SQL_FILE"
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  NYTTIGE KOMMANDOER                                        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  # Se siste kjøringer:"
echo "  SELECT * FROM cron.job_run_details WHERE jobname LIKE 'klarpakke%' ORDER BY start_time DESC LIMIT 10;"
echo ""
echo "  # Pause trading:"
echo "  UPDATE cron.job SET active = false WHERE jobname = 'klarpakke-trading-tick';"
echo ""
echo "  # Gjenoppta trading:"
echo "  UPDATE cron.job SET active = true WHERE jobname = 'klarpakke-trading-tick';"
echo ""
echo "  # Slett jobbene:"
echo "  SELECT cron.unschedule('klarpakke-trading-tick');"
echo "  SELECT cron.unschedule('klarpakke-trading-recover');"
echo ""
echo -e "${GREEN}✓ Setup klart!${NC}"
echo ""

# Spør om åpning av fil
read -p "Åpne SQL-filen nå? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v code &> /dev/null; then
        code "$SQL_FILE"
    elif command -v open &> /dev/null; then
        open "$SQL_FILE"
    elif command -v cat &> /dev/null; then
        echo ""
        cat "$SQL_FILE"
    fi
fi
