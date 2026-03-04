#!/bin/bash
# =====================================================
# PRE-DEPLOY VERIFISERING
# Alt-i-ett sjekk før deploy
# =====================================================

echo "========================================"
echo "🚀 PRE-DEPLOY VERIFISERING"
echo "========================================"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# 1. Sjekk at bygg finnes
echo "1️⃣  Sjekker build..."
if [ -d "out" ] && [ -f "out/no.html" ]; then
    echo -e "  ${GREEN}✅${NC} Build funnet i out/"
else
    echo -e "  ${RED}❌${NC} Build mangler! Kjør: npm run build"
    ((ERRORS++))
fi

# 2. Kritiske filer
echo ""
echo "2️⃣  Kritiske filer..."
CRITICAL=(
    "out/no.html"
    "out/en.html"
    "out/no/opptak.html"
    "out/en/opptak.html"
    "out/no/opptak/takk.html"
    "out/en/opptak/takk.html"
    "out/404.html"
    "functions/api/beta-signup.js"
    "functions/_routes.json"
    "public/_redirects"
)

for file in "${CRITICAL[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✅${NC} $file"
    else
        echo -e "  ${RED}❌${NC} $file - MANGLER!"
        ((ERRORS++))
    fi
done

# 3. _routes.json validasjon
echo ""
echo "3️⃣  _routes.json konfigurasjon..."
if [ -f "functions/_routes.json" ]; then
    if cat functions/_routes.json | grep -q "no/opptak"; then
        echo -e "  ${GREEN}✅${NC} Ruter konfigurert for /no/opptak"
    else
        echo -e "  ${YELLOW}⚠️${NC}  /no/opptak rute mangler i _routes.json"
        ((WARNINGS++))
    fi
fi

# 4. Git status
echo ""
echo "4️⃣  Git status..."
if git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "  ${GREEN}✅${NC} Ingen uncommitted endringer"
else
    echo -e "  ${YELLOW}⚠️${NC}  Det finnes uncommitted endringer:"
    git status --short | head -5 | sed 's/^/     /'
    ((WARNINGS++))
fi

# 5. Pakkestørrelse
echo ""
echo "5️⃣  Build størrelse..."
SIZE=$(du -sh out/ 2>/dev/null | cut -f1)
SIZE_BYTES=$(du -sb out/ 2>/dev/null | cut -f1)
echo "  📦 Total størrelse: $SIZE"
if [ "$SIZE_BYTES" -gt 50000000 ]; then
    echo -e "  ${YELLOW}⚠️${NC}  Stor build (>50MB) - sjekk for ubrukte assets"
    ((WARNINGS++))
fi

# 6. Env variabler (sjekk at de er satt)
echo ""
echo "6️⃣  Environment variabler..."
if [ -f ".env.local" ]; then
    if grep -q "SUPABASE_SERVICE_ROLE_KEY=eyJ" .env.local 2>/dev/null; then
        echo -e "  ${GREEN}✅${NC} .env.local ser ut til å være konfigurert"
    else
        echo -e "  ${YELLOW}⚠️${NC}  .env.local kan mangle verdier"
        ((WARNINGS++))
    fi
else
    echo -e "  ${YELLOW}⚠️${NC}  .env.local finnes ikke (kopier fra .env.local.example)"
    ((WARNINGS++))
fi

# Oppsummering
echo ""
echo "========================================"
echo "📊 OPPSUMMERING"
echo "========================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 KLAR FOR DEPLOY!${NC}"
    echo ""
    echo "Neste steg:"
    echo "  git push origin main"
    echo "  # eller: wrangler pages deploy out"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS advarsler${NC}"
    echo ""
    echo "Kan deploye, men sjekk advarslene først."
    exit 0
else
    echo -e "${RED}❌ $ERRORS feil, $WARNINGS advarsler${NC}"
    echo ""
    echo "Fiks feilene før deploy."
    exit 1
fi
