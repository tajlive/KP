#!/bin/bash
# Linear API Test - Automatisk verifisering
# Kjør: bash scripts/linear-test.sh

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           🔍 Linear API Test                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Sjekk om API key finnes
if [ -z "$LINEAR_API_KEY" ]; then
  # Prøv å hente fra .env.local
  if [ -f ".env.local" ]; then
    export LINEAR_API_KEY=$(grep "LINEAR_API_KEY" .env.local | cut -d'=' -f2)
  fi
fi

if [ -z "$LINEAR_API_KEY" ]; then
  echo -e "${RED}❌ LINEAR_API_KEY ikke funnet${NC}"
  echo "Kjør: bash scripts/setup-linear-auto.sh"
  exit 1
fi

echo -e "${BLUE}ℹ️  API-nøkkel funnet: ${LINEAR_API_KEY:0:20}...${NC}"
echo ""

# Test 1: Tilkobling
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Tilkobling"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

response=$(curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ viewer { name email } }"}')

if echo "$response" | grep -q '"data"'; then
  name=$(echo "$response" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo -e "${GREEN}✅ Tilkobling OK${NC}"
  echo "  Bruker: ${CYAN}$name${NC}"
else
  echo -e "${RED}❌ Tilkobling feilet${NC}"
  echo "  Respons: $response"
  exit 1
fi

# Test 2: Teams
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Teams"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

team_response=$(curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ teams { nodes { name key } } }"}')

if echo "$team_response" | grep -q '"teams"'; then
  teams=$(echo "$team_response" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
  team_count=$(echo "$teams" | wc -l)
  echo -e "${GREEN}✅ Teams hentet ($team_count)${NC}"
  echo "$teams" | while read team; do
    echo "  • $team"
  done
else
  echo -e "${RED}❌ Kunne ikke hente teams${NC}"
fi

# Test 3: Issues
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Issues"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

issue_response=$(curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ issues(first: 3) { nodes { identifier title state { name } } } }"}')

if echo "$issue_response" | grep -q '"issues"'; then
  issue_count=$(echo "$issue_response" | grep -o '"identifier"' | wc -l)
  echo -e "${GREEN}✅ Issues hentet ($issue_count)${NC}"
else
  echo -e "${RED}❌ Kunne ikke hente issues${NC}"
fi

# Test 4: CLI
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Linear CLI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v lin &> /dev/null; then
  echo -e "${GREEN}✅ Linear CLI installert${NC}"
  echo "  Versjon: $(lin --version 2>/dev/null || echo 'ukjent')"
else
  echo -e "${RED}❌ Linear CLI ikke installert${NC}"
  echo "  Kjør: npm install -g @linear/cli"
fi

# Oppsummering
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
if [ $? -eq 0 ]; then
  echo "║           ✅ Alle tester passert!                             ║"
else
  echo "║           ⚠️  Noen tester feilet                              ║"
fi
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
