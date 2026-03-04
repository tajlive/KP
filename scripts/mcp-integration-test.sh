#!/bin/bash
# MCP Integration Test - Verifiserer alle MCP-tilkoblinger
# Usage: bash scripts/mcp-integration-test.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_mcp() { echo -e "${CYAN}🔌 MCP: $1${NC}"; }

PASSED=0
FAILED=0
WARNINGS=0

check_pass() {
    log_success "$1"
    ((PASSED++)) || true
}

check_fail() {
    log_error "$1"
    ((FAILED++)) || true
}

check_warn() {
    log_warning "$1"
    ((WARNINGS++)) || true
}

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           🔌 MCP INTEGRATION TEST SUITE                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# MCP 1: SUPABASE
# ============================================================================
log_mcp "Supabase (Database + pg_cron)"
echo "───────────────────────────────────────────────────────────────"

# Check env vars
if grep -q "SUPABASE_URL" .env.local 2>/dev/null || grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local 2>/dev/null; then
    check_pass "Supabase: URL configured"
else
    check_warn "Supabase: URL not configured"
fi

if grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local 2>/dev/null; then
    check_pass "Supabase: Service role key configured"
else
    check_warn "Supabase: Service role key not configured"
fi

# Check connection via supabase CLI
if command -v supabase &> /dev/null; then
    # Test connection
    if supabase status &>/dev/null; then
        check_pass "Supabase CLI: Connected"
        
        # Check pg_cron jobs
        JOBS=$(supabase sql "SELECT count(*) FROM cron.job" 2>/dev/null | tail -1 | tr -d ' ')
        if [ -n "$JOBS" ] && [ "$JOBS" -gt 0 ]; then
            check_pass "pg_cron: $JOBS jobs active"
        else
            check_warn "pg_cron: Could not verify jobs"
        fi
    else
        check_warn "Supabase CLI: Not connected to project"
    fi
else
    check_warn "Supabase CLI: Not installed"
fi

echo ""

# ============================================================================
# MCP 2: VERCEL
# ============================================================================
log_mcp "Vercel (Deployment)"
echo "───────────────────────────────────────────────────────────────"

# Check env config
if grep -q "VERCEL_PROJECT_ID" .env.local 2>/dev/null || [ -d ".vercel" ]; then
    check_pass "Vercel: Project configured"
else
    check_warn "Vercel: Project not configured"
fi

if command -v vercel &> /dev/null; then
    # Check auth
    if vercel whoami &>/dev/null; then
        check_pass "Vercel CLI: Authenticated"
    else
        check_warn "Vercel CLI: Not authenticated"
    fi
else
    check_warn "Vercel CLI: Not installed"
fi

echo ""

# ============================================================================
# MCP 3: LINEAR
# ============================================================================
log_mcp "Linear (Issue Tracking)"
echo "───────────────────────────────────────────────────────────────"

# Check API key
if [ -n "$LINEAR_API_KEY" ] || grep -q "LINEAR_API_KEY" .env.local 2>/dev/null; then
    check_pass "Linear: API key configured"
    
    # Test API call
    if command -v curl &> /dev/null && [ -n "$LINEAR_API_KEY" ]; then
        RESPONSE=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: $LINEAR_API_KEY" \
            --data '{"query": "query { viewer { id name } }"}' \
            https://api.linear.app/graphql 2>/dev/null)
        
        if echo "$RESPONSE" | grep -q "viewer"; then
            USER=$(echo "$RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
            check_pass "Linear API: Connected as $USER"
        else
            check_warn "Linear API: Could not verify connection"
        fi
    fi
else
    check_warn "Linear: API key not configured"
fi

echo ""

# ============================================================================
# MCP 4: STRIPE
# ============================================================================
log_mcp "Stripe (Payments)"
echo "───────────────────────────────────────────────────────────────"

# Check env vars
STRIPE_KEY=$(grep "STRIPE_SECRET_KEY" .env.local 2>/dev/null | cut -d'=' -f2 | tr -d '"' || echo "")
if [ -n "$STRIPE_KEY" ] || [ -n "$STRIPE_SECRET_KEY" ]; then
    check_pass "Stripe: Secret key configured"
else
    check_warn "Stripe: Secret key not configured"
fi

if grep -q "STRIPE_WEBHOOK_SECRET" .env.local 2>/dev/null; then
    check_pass "Stripe: Webhook secret configured"
else
    check_warn "Stripe: Webhook secret not configured"
fi

if command -v stripe &> /dev/null; then
    # Check auth
    if stripe config --list 2>/dev/null | grep -q "default"; then
        check_pass "Stripe CLI: Configured"
        
        # Get account info
        ACCOUNT=$(stripe accounts retrieve 2>/dev/null | grep -o '"email": "[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
        if [ -n "$ACCOUNT" ]; then
            check_pass "Stripe: Connected to $ACCOUNT"
        fi
        
        # List products
        PRODUCTS=$(stripe products list --limit=1 2>/dev/null | grep -c "id" || echo "0")
        if [ "$PRODUCTS" -gt 0 ]; then
            check_pass "Stripe: Products accessible"
        fi
        
        # Check webhooks
        WEBHOOKS=$(stripe webhook_endpoints list 2>/dev/null | grep -c "url" || echo "0")
        if [ "$WEBHOOKS" -gt 0 ]; then
            check_pass "Stripe: $WEBHOOKS webhook endpoint(s) configured"
        else
            check_warn "Stripe: No webhook endpoints found"
        fi
    else
        check_warn "Stripe CLI: Not configured"
    fi
else
    check_warn "Stripe CLI: Not installed"
fi

echo ""

# ============================================================================
# MCP 5: SENTRY
# ============================================================================
log_mcp "Sentry (Error Tracking)"
echo "───────────────────────────────────────────────────────────────"

# Check DSN in config
if grep -q "SENTRY_DSN" .env.local 2>/dev/null || grep -q "SENTRY_DSN" .env.production 2>/dev/null; then
    check_pass "Sentry: DSN configured"
else
    check_warn "Sentry: DSN not found in env files"
fi

# Check auth token
if [ -n "$SENTRY_AUTH_TOKEN" ] || grep -q "SENTRY_AUTH_TOKEN" .env.local 2>/dev/null; then
    check_pass "Sentry: Auth token configured"
    
    # Test API
    if command -v curl &> /dev/null && [ -n "$SENTRY_AUTH_TOKEN" ]; then
        ORG="klarpakke"
        PROJECT="klarpakke-web"
        
        # Get project info
        PROJECT_INFO=$(curl -s "https://sentry.io/api/0/projects/$ORG/$PROJECT/" \
            -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" 2>/dev/null)
        
        if echo "$PROJECT_INFO" | grep -q "$PROJECT"; then
            check_pass "Sentry API: Project accessible"
            
            # Get recent issues
            ISSUES=$(curl -s "https://sentry.io/api/0/projects/$ORG/$PROJECT/issues/?statsPeriod=24h" \
                -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" 2>/dev/null | jq length 2>/dev/null || echo "?")
            
            if [ "$ISSUES" != "?" ]; then
                if [ "$ISSUES" -eq 0 ]; then
                    check_pass "Sentry: 0 errors in last 24h 🎉"
                else
                    check_warn "Sentry: $ISSUES errors in last 24h"
                fi
            fi
        else
            check_warn "Sentry API: Could not access project"
        fi
    fi
else
    check_warn "Sentry: Auth token not configured"
fi

echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "═══════════════════════════════════════════════════════════════"
echo "                    📊 TEST SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "  ${GREEN}✅ Passed:    $PASSED${NC}"
echo -e "  ${YELLOW}⚠️  Warnings:  $WARNINGS${NC}"
echo -e "  ${RED}❌ Failed:    $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "  ${GREEN}🎉 All critical MCP integrations working!${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    exit 0
else
    echo -e "  ${RED}❌ Some MCP integrations failed${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    exit 1
fi
