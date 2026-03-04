#!/bin/bash
# =============================================================================
# MCP-STYLE POST-MIGRATION TEST
# =============================================================================

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     🧪 MCP POST-MIGRATION TEST                                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

PROJECT_REF="vuxbjlykgmzskxbclquf"
TOKEN="klarpakke-dev-token"
API_URL="https://$PROJECT_REF.functions.supabase.co"

# Farger
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

test_tool() {
    local name=$1
    local command=$2
    
    echo "🔧 TOOL: $name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    RESULT=$(eval "$command" 2>&1)
    STATUS=$?
    
    if [ $STATUS -eq 0 ]; then
        echo -e "${GREEN}✅ SUCCESS${NC}"
        echo "$RESULT" | head -20
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "$RESULT" | head -10
    fi
    echo ""
}

# 1. Test API Gateway
test_tool "test_api_endpoint" \
    "curl -s -H \"Authorization: Bearer $TOKEN\" $API_URL/api-gateway/health"

# 2. Test Taj Trade Engine
test_tool "test_taj_engine" \
    "curl -s $API_URL/taj-trade-engine | head -1"

# 3. Test Moonshot AI
test_tool "test_moonshot_ai" \
    "curl -s -X POST -H \"Authorization: Bearer $TOKEN\" -H \"Content-Type: application/json\" -d '{\"message\":\"Hei\"}' $API_URL/moonshot-chat | head -1"

# 4. Test Supabase Connection
test_tool "test_database_connection" \
    "curl -s -H \"Authorization: Bearer $TOKEN\" https://$PROJECT_REF.supabase.co/rest/v1/user_auto_trading_configs?select=id&limit=1"

# 5. List Edge Functions (via MCP-style)
echo "🔧 TOOL: list_edge_functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
supabase functions list --project-ref $PROJECT_REF 2>&1 | head -10
echo ""

# 6. Check Security Migration
echo "🔧 TOOL: check_security_migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "/Users/taj/klarpakke/supabase/migrations/20260215000005_security_hardening.sql" ]; then
    echo -e "${GREEN}✅ Security migration file exists${NC}"
    wc -l /Users/taj/klarpakke/supabase/migrations/20260215000005_security_hardening.sql
else
    echo -e "${RED}❌ Security migration not found${NC}"
fi
echo ""

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     🎯 TEST COMPLETE                                          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
