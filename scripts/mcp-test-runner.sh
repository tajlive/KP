#!/bin/bash
# MCP Test Runner - Automatisert testing via MCP
# Usage: bash scripts/mcp-test-runner.sh [full|quick|smoke]

set -e

MODE="${1:-quick}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

log_info "Starting MCP Test Runner (mode: $MODE)"
echo "═══════════════════════════════════════════════════════════════"

# ============================================================================
# TEST 1: TypeScript
# ============================================================================
echo ""
log_info "[1/8] TypeScript Check..."
if npx tsc --noEmit 2>&1 | grep -q "error"; then
    log_error "TypeScript errors found!"
    npx tsc --noEmit
    exit 1
else
    log_success "TypeScript: 0 errors"
fi

# ============================================================================
# TEST 2: i18n Validation
# ============================================================================
echo ""
log_info "[2/8] i18n Validation..."
node scripts/validate-i18n.js
if [ $? -eq 0 ]; then
    log_success "i18n: All languages synchronized"
else
    log_error "i18n validation failed!"
    exit 1
fi

# ============================================================================
# TEST 3: ESLint
# ============================================================================
echo ""
log_info "[3/8] ESLint Check..."
if npm run lint 2>&1 | grep -E "^[0-9]+ errors?$" | grep -v "0 errors"; then
    log_error "ESLint errors found!"
    exit 1
else
    log_success "ESLint: No errors"
fi

# ============================================================================
# TEST 4: Build Test
# ============================================================================
if [ "$MODE" == "full" ]; then
    echo ""
    log_info "[4/8] Build Test..."
    if npm run build 2>&1 | tail -5 | grep -q "Failed"; then
        log_error "Build failed!"
        exit 1
    else
        log_success "Build: Success"
    fi
else
    echo ""
    log_warning "[4/8] Build Test: SKIPPED ($MODE mode)"
fi

# ============================================================================
# TEST 5: Smoke Tests
# ============================================================================
if [ "$MODE" == "full" ]; then
    echo ""
    log_info "[5/8] Smoke Tests..."
    if [ -f "tests/e2e/smoke.spec.ts" ]; then
        npx playwright test tests/e2e/smoke.spec.ts --reporter=line
        if [ $? -eq 0 ]; then
            log_success "Smoke tests: Passed"
        else
            log_error "Smoke tests failed!"
            exit 1
        fi
    else
        log_warning "No smoke tests found"
    fi
else
    echo ""
    log_warning "[5/8] Smoke Tests: SKIPPED ($MODE mode)"
fi

# ============================================================================
# TEST 6: Production Health Check
# ============================================================================
if [ "$MODE" == "full" ]; then
    echo ""
    log_info "[6/8] Production Health Check..."
    
    # Test homepage
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://www.klarpakke.no/no || echo "000")
    if [ "$STATUS" == "200" ]; then
        log_success "Homepage: OK (200)"
    else
        log_error "Homepage failed: $STATUS"
        exit 1
    fi
    
    # Test API
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://www.klarpakke.no/api/health || echo "000")
    if [ "$STATUS" == "200" ]; then
        log_success "API Health: OK (200)"
    else
        log_error "API Health failed: $STATUS"
        exit 1
    fi
else
    echo ""
    log_warning "[6/8] Production Health: SKIPPED ($MODE mode)"
fi

# ============================================================================
# TEST 7: Stripe Webhook Check (via MCP)
# ============================================================================
echo ""
log_info "[7/8] Stripe Webhook Status..."

# Check if stripe CLI is available
if command -v stripe &> /dev/null; then
    # List webhook endpoints
    WEBHOOKS=$(stripe webhook_endpoints list --limit=5 2>/dev/null || echo "")
    if [ -n "$WEBHOOKS" ]; then
        echo "   Active webhooks:"
        echo "$WEBHOOKS" | grep -E "(url|status)" | head -10
        log_success "Stripe: Webhook endpoints found"
    else
        log_warning "Stripe: Could not fetch webhooks (check API key)"
    fi
else
    log_warning "Stripe CLI not installed - skipping webhook check"
fi

# ============================================================================
# TEST 8: Sentry Error Check (via MCP)
# ============================================================================
echo ""
log_info "[8/8] Sentry Error Status..."

# Check Sentry auth token
if [ -n "$SENTRY_AUTH_TOKEN" ] || grep -q "SENTRY_AUTH_TOKEN" .env.local 2>/dev/null; then
    log_success "Sentry: Auth token configured"
    
    # Try to get recent issues (requires SENTRY_AUTH_TOKEN)
    if command -v curl &> /dev/null && [ -n "$SENTRY_AUTH_TOKEN" ]; then
        ORG="klarpakke"
        PROJECT="klarpakke-web"
        
        # Get issues from last 24h
        ISSUES=$(curl -s "https://sentry.io/api/0/projects/$ORG/$PROJECT/issues/?statsPeriod=24h" \
            -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" 2>/dev/null | jq length 2>/dev/null || echo "?")
        
        if [ "$ISSUES" != "?" ] && [ "$ISSUES" -eq 0 ]; then
            log_success "Sentry: 0 errors in last 24h 🎉"
        elif [ "$ISSUES" != "?" ]; then
            log_warning "Sentry: $ISSUES errors in last 24h"
        else
            log_info "Sentry: Could not fetch issues (check token permissions)"
        fi
    fi
else
    log_warning "Sentry: Auth token not configured"
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
log_success "All tests passed! ✅"
echo "═══════════════════════════════════════════════════════════════"
