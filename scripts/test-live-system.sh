#!/bin/bash
# =============================================================================
# KLARPAKKE - LIVE SYSTEM TEST
# =============================================================================
# Kjør etter deploy for å verifisere at alt fungerer
# =============================================================================

API_URL="https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1"
TOKEN="klarpakke-dev-token"

# Farger
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
  else
    echo -e "${RED}❌ FAIL${NC}"
  fi
}

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     KLARPAKKE LIVE SYSTEM TEST                                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: API Gateway Health
echo "1️⃣  Testing API Gateway Health..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api-gateway/health")
if [ "$RESPONSE" = "200" ]; then
  echo -e "   ${GREEN}✅ API Gateway responderer (HTTP 200)${NC}"
  # Vis respons
  curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api-gateway/health" | jq -r '"
   Status: \(.status)
   Version: \(.version)
   Cache: \(.cache.size) entries
  "'
else
  echo -e "   ${RED}❌ API Gateway svarer ikke (HTTP $RESPONSE)${NC}"
fi
echo ""

# Test 2: Git Status (hvis GITHUB_TOKEN er satt)
echo "2️⃣  Testing Git Status..."
GIT_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api-gateway/git/status")
if echo "$GIT_RESP" | jq -e '.branch' > /dev/null 2>&1; then
  echo -e "   ${GREEN}✅ Git Status fungerer${NC}"
  echo "$GIT_RESP" | jq -r '"
   Branch: \(.branch)
   Siste commit: \(.last_commit)
   Melding: \(.last_message)
  "'
else
  echo -e "   ${YELLOW}⚠️  Git Status (sjekk at GITHUB_TOKEN er satt)${NC}"
  echo "   Hint: supabase secrets set GITHUB_TOKEN=ghp_xxx"
fi
echo ""

# Test 3: Project Info
echo "3️⃣  Testing Project Info..."
PROJ_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api-gateway/project/info")
if echo "$PROJ_RESP" | jq -e '.name' > /dev/null 2>&1; then
  echo -e "   ${GREEN}✅ Project Info fungerer${NC}"
  echo "$PROJ_RESP" | jq -r '"
   Navn: \(.name)
   Versjon: \(.version)
   Dependencies: \(.dependencies)
  "'
else
  echo -e "   ${YELLOW}⚠️  Project Info (sjekk GITHUB_TOKEN)${NC}"
fi
echo ""

# Test 4: Moonshot AI
echo "4️⃣  Testing Moonshot AI Chat..."
AI_RESP=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hei!"}' \
  "$API_URL/moonshot-chat")
if echo "$AI_RESP" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "   ${GREEN}✅ Moonshot AI fungerer${NC}"
  echo "   Respons mottatt!"
else
  echo -e "   ${YELLOW}⚠️  Moonshot AI (sjekk at MOONSHOT_API_KEY er satt)${NC}"
fi
echo ""

# Test 5: Taj Trade Engine
echo "5️⃣  Testing Taj Trade Engine..."
TAJ_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/taj-trade-engine")
if [ -n "$TAJ_RESP" ] && [ "$TAJ_RESP" != "null" ]; then
  echo -e "   ${GREEN}✅ Taj Trade Engine svarer${NC}"
  echo "   Engine er aktiv og klar!"
else
  echo -e "   ${YELLOW}⚠️  Taj Trade Engine (kan være OK hvis ingen trades)${NC}"
fi
echo ""

# Test 6: Supabase Connection
echo "6️⃣  Testing Supabase Database..."
SUPA_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://vuxbjlykgmzskxbclquf.supabase.co/rest/v1/user_auto_trading_configs?select=id&limit=1")
if [ -n "$SUPA_RESP" ] && [ "$SUPA_RESP" != "null" ]; then
  echo -e "   ${GREEN}✅ Supabase Database tilgjengelig${NC}"
else
  echo -e "   ${RED}❌ Supabase Database svarer ikke${NC}"
fi
echo ""

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     TEST FULLFØRT!                                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Neste steg:"
echo "  • Hvis alle tester er ✅ -> Systemet er LIVE!"
echo "  • Hvis noen er ⚠️  -> Sjekk secrets i Supabase Dashboard"
echo "  • Hvis noen er ❌ -> Sjekk logs i Supabase Dashboard"
echo ""
