#!/bin/bash

# Setup script for Uke 1 - UI Improvements
echo "🚀 Klarpakke - Uke 1 Setup"
echo "=========================="
echo ""

# Farger
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📋 Denne migrasjonen legger til:${NC}"
echo "   • Progressive Dashboard (view_mode_preference)"
echo "   • Accessibility settings (font_size_preference, high_contrast_mode)"
echo "   • BankID verifisering (bankid_verified)"
echo "   • Onboarding tracking (onboarding_completed)"
echo "   • System health logging"
echo ""

# Sjekk om SQL-filen finnes
MIGRATION_FILE="supabase/migrations/20260209000000_uke1_ui_improvements.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Feil: Migrasjonsfil ikke funnet${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Fant migrasjonsfil${NC}"
echo ""

# Prøv Supabase CLI først
if command -v supabase &> /dev/null; then
    echo -e "${BLUE}🔧 Prøver Supabase CLI...${NC}"
    
    if supabase db push; then
        echo ""
        echo -e "${GREEN}✅ Migrasjon vellykket!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  Supabase CLI feilet${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Supabase CLI ikke installert${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Manuell instruksjon:${NC}"
echo "======================"
echo ""
echo "1. Gå til https://supabase.com/dashboard"
echo "2. Velg ditt Klarpakke-prosjekt"
echo "3. Gå til SQL Editor"
echo "4. Kopier innholdet fra:"
echo -e "   ${BLUE}$MIGRATION_FILE${NC}"
echo "5. Lim inn og klikk 'Run'"
echo ""

# Kopier til clipboard på macOS
if command -v pbcopy &> /dev/null; then
    cat "$MIGRATION_FILE" | pbcopy
    echo -e "${GREEN}✓ SQL kopiert til clipboard!${NC}"
fi

echo ""
echo -e "${GREEN}✅ Etter migrasjon, test med:${NC}"
echo "   npm run dev"
echo "   open http://localhost:3000/onboarding"
