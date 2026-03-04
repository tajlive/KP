#!/bin/bash
# =============================================================================
# Klarpakke: Setup Supabase pg_cron for Auto-Trading
# Dette scriptet kjører SQL i Supabase SQL Editor via MCP
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Klarpakke Supabase Cron Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Sjekk at .env.local finnes
if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
    echo -e "${RED}Feil: .env.local ikke funnet!${NC}"
    exit 1
fi

# Hent CRON_SECRET
CRON_SECRET=$(grep "CRON_SECRET=" "$PROJECT_ROOT/.env.local" | cut -d'=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$CRON_SECRET" ]; then
    echo -e "${RED}Feil: CRON_SECRET ikke funnet i .env.local!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ CRON_SECRET funnet${NC}"
echo ""

# Les SQL-filen og erstatt placeholder
SQL_FILE="$SCRIPT_DIR/setup-supabase-cron.sql"
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}Feil: $SQL_FILE ikke funnet!${NC}"
    exit 1
fi

# Opprett temp SQL-fil med erstattet CRON_SECRET
TEMP_SQL=$(mktemp)
sed "s/DIN_CRON_SECRET_HER/$CRON_SECRET/g" "$SQL_FILE" > "$TEMP_SQL"

echo -e "${YELLOW}SQL-kommandoer som skal kjøres:${NC}"
echo -e "${BLUE}----------------------------------------${NC}"
head -20 "$TEMP_SQL"
echo -e "${BLUE}----------------------------------------${NC}"
echo ""

# Sjekk om MCP er tilgjengelig
echo -e "${YELLOW}Sjekker MCP-tilkobling...${NC}"

# Prøv å bruke kimi MCP
if command -v kimi &> /dev/null; then
    echo -e "${GREEN}✓ Kimi CLI funnet${NC}"
    
    # Sjekk om vi kan liste MCP-verktøy
    if kimi mcp list 2>/dev/null | grep -q "supabase"; then
        echo -e "${GREEN}✓ Supabase MCP funnet${NC}"
        
        # Kjør SQL via MCP
        echo -e "${YELLOW}Kjører SQL via MCP...${NC}"
        
        # Desverre støtter ikke Supabase MCP direkte SQL-execution ennå
        # Vi må bruke SQL Editor manuelt
        echo -e "${YELLOW}Merk: Supabase MCP støtter ikke direkte SQL-execution${NC}"
        echo -e "${YELLOW}SQL-filen er klargjort: $TEMP_SQL${NC}"
        echo ""
    else
        echo -e "${YELLOW}! Supabase MCP ikke konfigurert${NC}"
    fi
else
    echo -e "${YELLOW}! Kimi CLI ikke funnet i PATH${NC}"
fi

# Vis instruksjoner for manuell kjøring
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  MANUELL KJØRING (anbefalt)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "1. Gå til Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf"
echo ""
echo "2. Klikk på 'SQL Editor' i venstre meny"
echo ""
echo "3. Klikk '+ New query'"
echo ""
echo "4. Kopier innholdet fra denne filen:"
echo -e "   ${BLUE}$TEMP_SQL${NC}"
echo ""
echo "5. Klikk 'Run' (Ctrl+Enter)"
echo ""
echo "6. Verifiser at jobbene ble opprettet:"
echo "   Sjekk at du ser 2 rader i resultatet:"
echo "   - klarpakke-trading-tick"
echo "   - klarpakke-trading-recover"
echo ""
echo -e "${GREEN}========================================${NC}"
echo ""

# Spør om brukeren vil åpne filen
read -p "Vil du åpne SQL-filen nå? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v code &> /dev/null; then
        code "$TEMP_SQL"
    elif command -v cat &> /dev/null; then
        cat "$TEMP_SQL"
    fi
fi

echo ""
echo -e "${GREEN}SQL-fil klargjort med din CRON_SECRET!${NC}"
echo -e "${YELLOW}Husk å slette temp-filen når du er ferdig: rm $TEMP_SQL${NC}"
