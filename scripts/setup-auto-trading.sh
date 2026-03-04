#!/bin/bash

# Auto-Trading Setup Script for Klarpakke
# Dette scriptet hjelper deg med å sette opp auto-trading database tabeller

echo "🚀 Klarpakke Auto-Trading Setup"
echo "================================"
echo ""

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Sjekk om filen finnes
MIGRATION_FILE="/Users/taj/klarpakke/supabase/migrations/20260208000000_add_auto_trading.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Feil: Migrasjonsfil ikke funnet${NC}"
    echo "Forventet: $MIGRATION_FILE"
    exit 1
fi

echo -e "${BLUE}📁 Fant migrasjonsfil:${NC} $MIGRATION_FILE"
echo ""

# Vis hva som skal gjøres
echo -e "${YELLOW}📋 Dette vil opprette følgende tabeller:${NC}"
echo "   • trading_api_keys       (krypterte API-nøkler)"
echo "   • auto_trade_settings    (brukerinnstillinger)"
echo "   • auto_trades            (trade-logg)"
echo "   • auto_trade_daily_stats (daglig statistikk)"
echo ""

# Prøv automatisk db push først
echo -e "${BLUE}🔧 Forsøker automatisk database push...${NC}"
echo ""

if command -v supabase &> /dev/null; then
    echo "Supabase CLI funnet, prøver db push..."
    
    # Sjekk om vi er logget inn
    supabase projects list &> /dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Innlogget på Supabase${NC}"
        
        # Prøv db push
        supabase db push
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ Database migrasjon vellykket!${NC}"
            exit 0
        else
            echo -e "${YELLOW}⚠️  Automatisk push feilet. Prøver manuell metode...${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Ikke logget inn på Supabase CLI${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Supabase CLI ikke installert${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Manuell instruksjon:${NC}"
echo "======================="
echo ""
echo "1. Gå til Supabase Dashboard:"
echo -e "   ${BLUE}https://supabase.com/dashboard${NC}"
echo ""
echo "2. Velg ditt Klarpakke-prosjekt"
echo ""
echo "3. Klikk på 'SQL Editor' i venstre meny"
echo ""
echo "4. Klikk 'New query'"
echo ""
echo "5. Kopier og lim inn følgende SQL:"
echo ""
echo "   (SQL-filen er kopiert til clipboard)"

# Kopier SQL til clipboard (macOS)
cat "$MIGRATION_FILE" | pbcopy 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "   ${GREEN}✓ SQL kopiert til clipboard!${NC}"
else
    echo -e "   ${YELLOW}⚠️  Kunne ikke kopiere automatisk${NC}"
    echo "   Filplassering: $MIGRATION_FILE"
fi

echo ""
echo "6. Klikk 'Run' for å kjøre migrasjonen"
echo ""
echo -e "${GREEN}✅ Ferdig!${NC} Auto-trading tabeller er klare."
echo ""
echo "Test at det fungerer:"
echo "   • Gå til /admin/test-auto-trading"
echo "   • Kjør en test med et mock-signal"
