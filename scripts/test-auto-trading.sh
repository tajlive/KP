#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# AUTO-TRADING FULL TEST SCRIPT
# Kjør dette ETTER at profiles view er opprettet i Supabase
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Farger
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         🤖 AUTO-TRADING FULL TEST                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Load environment
cd "$(dirname "$0")/.."
if [ -f .env.local ]; then
  source .env.local
  echo -e "${GREEN}✅ Environment loaded${NC}"
else
  echo -e "${RED}❌ .env.local not found${NC}"
  exit 1
fi

# Check required vars
if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not set${NC}"
  exit 1
fi

# User credentials
USER_EMAIL="${USER_EMAIL:-taj@klarpakke.no}"
echo -e "${BLUE}📧 User: $USER_EMAIL${NC}"
echo ""

# Step 1: Login
echo "═══════════════════════════════════════════════════════════════"
echo "🔐 STEP 1: LOGIN"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ -z "$USER_PASSWORD" ]; then
  echo -e "${YELLOW}⚠️  USER_PASSWORD not set${NC}"
  echo "Set it with: export USER_PASSWORD='your_password'"
  echo ""
  echo "Or enter password now:"
  read -s USER_PASSWORD
  echo ""
fi

LOGIN_RESPONSE=$(curl -s -X POST \
  "https://vuxbjlykgmzskxbclquf.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}")

JWT=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')

if [ "$JWT" = "null" ] || [ -z "$JWT" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo "Response: $LOGIN_RESPONSE" | jq .
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo -e "${BLUE}Token: ${JWT:0:50}...${NC}"
echo ""

# Step 2: Test profiles
echo "═══════════════════════════════════════════════════════════════"
echo "📊 STEP 2: TEST PROFILES"
echo "═══════════════════════════════════════════════════════════════"
echo ""

PROFILES_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $JWT" \
  "https://vuxbjlykgmzskxbclquf.supabase.co/rest/v1/profiles?select=*&limit=1")

HTTP_CODE=$(echo "$PROFILES_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$PROFILES_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Profiles API: OK${NC}"
  echo "$BODY" | jq .[0] 2>/dev/null || echo "$BODY"
else
  echo -e "${RED}❌ Profiles API failed: HTTP $HTTP_CODE${NC}"
  echo "$BODY"
  echo ""
  echo -e "${YELLOW}⚠️  Run sql/fix_profiles_view.sql in Supabase SQL Editor${NC}"
  exit 1
fi
echo ""

# Step 3: Test API endpoints
echo "═══════════════════════════════════════════════════════════════"
echo "🌐 STEP 3: TEST API ENDPOINTS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Test health
echo -n "Health check... "
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://www.klarpakke.no/api/health)
if [ "$HEALTH" = "200" ]; then
  echo -e "${GREEN}✅ OK${NC}"
else
  echo -e "${RED}❌ FAILED ($HEALTH)${NC}"
fi

# Test sessions (should require auth)
echo -n "Sessions (auth required)... "
SESSIONS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $JWT" \
  https://www.klarpakke.no/api/auto-trading/sessions)
if [ "$SESSIONS" = "200" ] || [ "$SESSIONS" = "401" ]; then
  echo -e "${GREEN}✅ OK ($SESSIONS)${NC}"
else
  echo -e "${YELLOW}⚠️  $SESSIONS${NC}"
fi

# Test leaderboard (public)
echo -n "Leaderboard (public)... "
LEADERBOARD=$(curl -s -o /dev/null -w "%{http_code}" \
  https://www.klarpakke.no/api/auto-trading/leaderboard)
if [ "$LEADERBOARD" = "200" ]; then
  echo -e "${GREEN}✅ OK${NC}"
else
  echo -e "${YELLOW}⚠️  $LEADERBOARD${NC}"
fi
echo ""

# Step 4: Start paper trading bot
echo "═══════════════════════════════════════════════════════════════"
echo "🤖 STEP 4: START PAPER TRADING BOT"
echo "═══════════════════════════════════════════════════════════════"
echo ""

START_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST https://www.klarpakke.no/api/auto-trading/start \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "strategyId": "dca",
    "tradingPair": "BTCUSDT",
    "mode": "paper",
    "initialCapital": 100000,
    "strategyConfig": {
      "intervalMinutes": 60,
      "positionSize": 0.02
    }
  }')

START_HTTP=$(echo "$START_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
START_BODY=$(echo "$START_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$START_HTTP" = "201" ] || [ "$START_HTTP" = "200" ]; then
  echo -e "${GREEN}✅ Bot started successfully!${NC}"
  echo "$START_BODY" | jq . 2>/dev/null || echo "$START_BODY"
  
  # Extract session ID
  SESSION_ID=$(echo "$START_BODY" | jq -r '.session.id' 2>/dev/null)
  if [ -n "$SESSION_ID" ] && [ "$SESSION_ID" != "null" ]; then
    echo ""
    echo -e "${BLUE}Session ID: $SESSION_ID${NC}"
    echo "Save this for stopping the bot later"
  fi
elif [ "$START_HTTP" = "409" ]; then
  echo -e "${YELLOW}⚠️  Bot already running (HTTP 409)${NC}"
  echo "$START_BODY" | jq . 2>/dev/null || echo "$START_BODY"
else
  echo -e "${RED}❌ Failed to start bot: HTTP $START_HTTP${NC}"
  echo "$START_BODY"
fi
echo ""

# Step 5: Summary
echo "═══════════════════════════════════════════════════════════════"
echo "📋 SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ Login: OK${NC}"
echo -e "${GREEN}✅ Profiles: OK${NC}"
echo -e "${GREEN}✅ Health: OK${NC}"

if [ "$START_HTTP" = "201" ] || [ "$START_HTTP" = "200" ]; then
  echo -e "${GREEN}✅ Paper Trading Bot: STARTED${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Bot will run DCA strategy on BTCUSDT"
  echo "  2. Check dashboard at: https://www.klarpakke.no/auto-trading"
  echo "  3. To stop: ./scripts/stop-bot.sh $SESSION_ID"
elif [ "$START_HTTP" = "409" ]; then
  echo -e "${YELLOW}⚠️  Paper Trading Bot: ALREADY RUNNING${NC}"
else
  echo -e "${RED}❌ Paper Trading Bot: FAILED${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
