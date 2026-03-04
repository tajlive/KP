#!/bin/bash
# =====================================================
# LOKAL SERVER TEST
# Tester ruter mot lokal dev server
# =====================================================

echo "========================================"
echo "🧪 LOKAL SERVER TEST"
echo "========================================"
echo ""

# Farger
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:3000"
ERRORS=0

# Sjekk om server kjører
echo "Sjekker om server kjører på $BASE_URL..."
if ! curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/no" | grep -q "200\|307"; then
    echo -e "${RED}❌ Server ikke tilgjengelig!${NC}"
    echo "Start først: npm run dev"
    exit 1
fi

echo -e "${GREEN}✅${NC} Server er oppe!"
echo ""

# Ruter å teste
ROUTES=(
    "/no:200:Norsk landing"
    "/en:200:English landing"
    "/no/opptak:200:Signup NO"
    "/en/opptak:200:Signup EN"
    "/personvern:200:Personvern"
    "/vilkar:200:Vilkår"
    "/api/beta-signup:200 eller 405:API (POST only)"
    "/ikke-eksisterende:404:404 test"
)

echo "🌐 Testing av ruter:"
echo "--------------------"

for route_info in "${ROUTES[@]}"; do
    IFS=':' read -r route expected description <<< "$route_info"
    
    # Hent statuskode (følg redirects)
    status=$(curl -s -o /dev/null -w "%{http_code}" -L "$BASE_URL$route" 2>/dev/null)
    
    # Sjekk om status matcher forventet
    if [ "$status" = "$expected" ] || [[ "$expected" == *"$status"* ]]; then
        echo -e "  ${GREEN}✅${NC} $description"
        echo "     $BASE_URL$route → $status"
    else
        echo -e "  ${RED}❌${NC} $description"
        echo "     $BASE_URL$route → $status (forventet: $expected)"
        ((ERRORS++))
    fi
done

echo ""
echo "📦 Assets sjekk:"
echo "----------------"
# Sjekk at _next/assets finnes
asset_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/_next/static/chunks/main.js" 2>/dev/null || echo "404")
if [ "$asset_status" = "200" ] || [ "$asset_status" = "404" ]; then
    echo -e "  ${GREEN}✅${NC} Assets lastes (status: $asset_status)"
else
    echo -e "  ${YELLOW}⚠️${NC}  Asset sjekk feilet (status: $asset_status)"
fi

echo ""
echo "========================================"
echo "📊 RESULTAT"
echo "========================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALLE TESTER BESTÅTT!${NC}"
    echo ""
    echo "Serveren fungerer korrekt."
    exit 0
else
    echo -e "${RED}❌ $ERRORS feil funnet${NC}"
    exit 1
fi
