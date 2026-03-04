#!/bin/bash
# =====================================================
# LIVE DEPLOYMENT VERIFISERING
# Tester prod-URL og alle funksjoner
# =====================================================

BASE_URL="https://klarpakke.no"
TEST_EMAIL="test-$(date +%s)@example.com"

echo "========================================"
echo "🧪 LIVE DEPLOYMENT TEST"
echo "========================================"
echo ""
echo "📡 Base URL: $BASE_URL"
echo "⏰ Tid: $(date '+%H:%M:%S')"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

# 1. Sjekk at siden er live
echo "1️⃣  Sjekker om siden er live..."
echo "--------------------------------"

MAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "$BASE_URL/no" 2>/dev/null)

if [ "$MAIN_STATUS" = "200" ]; then
    echo -e "${GREEN}✅${NC} $BASE_URL/no er LIVE! (HTTP 200)"
    
    # Sjekk innhold
    TITLE=$(curl -s -L "$BASE_URL/no" 2>/dev/null | grep -o "KLARPAKKE UNIVERSITET" | head -1)
    if [ "$TITLE" = "KLARPAKKE UNIVERSITET" ]; then
        echo -e "  ${GREEN}✅${NC} Riktig innhold funnet"
    else
        echo -e "  ${YELLOW}⚠️${NC}  Innhold kan være feil"
    fi
else
    echo -e "${RED}❌${NC} Siden ikke live ennå (HTTP $MAIN_STATUS)"
    echo "    Vent 2-3 minutter og prøv igjen"
    ((ERRORS++))
fi

echo ""

# 2. Test alle kritiske ruter
echo "2️⃣  Testing av ruter..."
echo "--------------------------------"

ROUTES=(
    "/no:Norsk landing"
    "/en:English landing"
    "/no/opptak:Signup NO"
    "/en/opptak:Signup EN"
    "/no/opptak/takk:Takk NO"
    "/en/opptak/takk:Takk EN"
    "/personvern:Personvern"
    "/vilkar:Vilkår"
)

for route_info in "${ROUTES[@]}"; do
    IFS=':' read -r route description <<< "$route_info"
    url="$BASE_URL$route"
    
    status=$(curl -s -o /dev/null -w "%{http_code}" -L "$url" 2>/dev/null)
    
    if [ "$status" = "200" ]; then
        echo -e "  ${GREEN}✅${NC} $description ($status)"
    elif [ "$status" = "000" ]; then
        echo -e "  ${YELLOW}⏳${NC}  $description (venter...)"
        ((ERRORS++))
    else
        echo -e "  ${RED}❌${NC} $description ($status)"
        ((ERRORS++))
    fi
done

echo ""

# 3. Test API endpoint
echo "3️⃣  Testing API endpoint..."
echo "--------------------------------"

API_URL="$BASE_URL/api/beta-signup"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"test": true}' \
    "$API_URL" 2>/dev/null)

if [ "$API_STATUS" = "200" ] || [ "$API_STATUS" = "400" ] || [ "$API_STATUS" = "405" ]; then
    echo -e "  ${GREEN}✅${NC} API svarer (HTTP $API_STATUS)"
    echo "     Merk: 400/405 er OK fordi test-data mangler felt"
else
    echo -e "  ${YELLOW}⚠️${NC}  API svarer ikke som forventet (HTTP $API_STATUS)"
    echo "     Kan være fordi Functions ikke er deployet ennå"
fi

echo ""

# 4. Sjekk assets
echo "4️⃣  Sjekker assets..."
echo "--------------------------------"

ASSET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/_next/static/css/app.css" 2>/dev/null || echo "404")
if [ "$ASSET_STATUS" = "200" ]; then
    echo -e "  ${GREEN}✅${NC} CSS assets lastes"
else
    echo -e "  ${YELLOW}⚠️${NC}  CSS assets sjekk: $ASSET_STATUS"
fi

echo ""

# 5. Test full signup flow (valgfritt)
echo "5️⃣  Full signup flow test (valgfritt)..."
echo "--------------------------------"
echo "  For å teste full flow med Supabase + Resend:"
echo "  1. Gå til $BASE_URL/no/opptak"
echo "  2. Fyll ut form med ekte email"
echo "  3. Sjekk at du får velkomst-email"
echo "  4. Sjekk at rad opprettes i Supabase"

echo ""
echo "========================================"
echo "📊 RESULTAT"
echo "========================================"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 DEPLOYMENT LIVE!${NC}"
    echo ""
    echo "Alle kritiske ruter fungerer."
    echo ""
    echo "Test manuelt:"
    echo "  🌐 $BASE_URL/no"
    echo "  📝 $BASE_URL/no/opptak"
    exit 0
else
    echo -e "${YELLOW}⚠️  $ERRORS feil funnet${NC}"
    echo ""
    echo "Siden kan være delvis deployet."
    echo "Vent 2-3 minutter og kjør scriptet igjen:"
    echo "  ./scripts/verify-live-deployment.sh"
    exit 1
fi
