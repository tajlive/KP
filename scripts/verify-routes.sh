#!/bin/bash
# =====================================================
# RUTE VERIFISERING SCRIPT
# Sjekker at alle ruter finnes og fungerer
# =====================================================

echo "========================================"
echo "🔍 RUTE VERIFISERING"
echo "========================================"
echo ""

# Farger
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

OUT_DIR="out"
ERRORS=0
WARNINGS=0

# Sjekk at out-mappe finnes
if [ ! -d "$OUT_DIR" ]; then
    echo -e "${RED}❌ FEIL: $OUT_DIR/ mappe ikke funnet!${NC}"
    echo "Kjør først: npm run build"
    exit 1
fi

echo "📋 Sjekker kritiske ruter..."
echo ""

# Definer kritiske ruter
CRITICAL_ROUTES=(
    "/no.html:Norsk landing"
    "/en.html:English landing"
    "/no/opptak.html:Signup NO"
    "/en/opptak.html:Signup EN"
    "/no/opptak/takk.html:Takk NO"
    "/en/opptak/takk.html:Takk EN"
    "/personvern.html:Privacy"
    "/vilkar.html:Terms"
    "/404.html:404 page"
)

echo "1️⃣  HTML-filer:"
echo "----------------"
for route_info in "${CRITICAL_ROUTES[@]}"; do
    IFS=':' read -r file description <<< "$route_info"
    filepath="${OUT_DIR}${file}"
    
    if [ -f "$filepath" ]; then
        size=$(stat -f%z "$filepath" 2>/dev/null || stat -c%s "$filepath" 2>/dev/null)
        echo -e "  ${GREEN}✅${NC} $description"
        echo "     Fil: $file ($size bytes)"
    else
        echo -e "  ${RED}❌${NC} $description - MANGLER!"
        echo "     Forventet: $file"
        ((ERRORS++))
    fi
done

echo ""
echo "2️⃣  Assets (JS/CSS):"
echo "--------------------"
ASSET_COUNT=$(find "$OUT_DIR/_next" -type f 2>/dev/null | wc -l)
if [ "$ASSET_COUNT" -gt 0 ]; then
    echo -e "  ${GREEN}✅${NC} $ASSET_COUNT assets funnet i _next/"
else
    echo -e "  ${RED}❌${NC} Ingen assets funnet!"
    ((ERRORS++))
fi

echo ""
echo "3️⃣  Cloudflare Functions:"
echo "-------------------------"
if [ -f "functions/api/beta-signup.js" ]; then
    echo -e "  ${GREEN}✅${NC} functions/api/beta-signup.js"
else
    echo -e "  ${YELLOW}⚠️${NC}  functions/api/beta-signup.js mangler"
    ((WARNINGS++))
fi

echo ""
echo "4️⃣  _routes.json konfigurasjon:"
echo "--------------------------------"
if [ -f "functions/_routes.json" ]; then
    echo -e "  ${GREEN}✅${NC} functions/_routes.json finnes"
    echo "     Innhold:"
    cat functions/_routes.json | sed 's/^/       /'
else
    echo -e "  ${YELLOW}⚠️${NC}  functions/_routes.json mangler"
    ((WARNINGS++))
fi

echo ""
echo "5️⃣  Filstørrelse sjekk:"
echo "----------------------"
for route_info in "${CRITICAL_ROUTES[@]}"; do
    IFS=':' read -r file description <<< "$route_info"
    filepath="${OUT_DIR}${file}"
    
    if [ -f "$filepath" ]; then
        size=$(stat -f%z "$filepath" 2>/dev/null || stat -c%s "$filepath" 2>/dev/null)
        if [ "$size" -lt 1000 ]; then
            echo -e "  ${YELLOW}⚠️${NC}  $description - Mistenkelig liten ($size bytes)"
            ((WARNINGS++))
        fi
    fi
done

echo ""
echo "========================================"
echo "📊 OPPSUMMERING"
echo "========================================"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALLE SJEKKER BESTÅTT!${NC}"
    echo ""
    echo "Klar for deploy!"
    exit 0
else
    echo -e "${RED}❌ $ERRORS feil, ${YELLOW}$WARNINGS advarsler${NC}"
    echo ""
    if [ $ERRORS -gt 0 ]; then
        echo "Fiks feilene før deploy."
        exit 1
    else
        echo "Advarsler kan ignoreres, men sjekk dem."
        exit 0
    fi
fi
