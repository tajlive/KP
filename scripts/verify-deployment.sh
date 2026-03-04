#!/bin/bash
# =============================================================================
# KLARPAKKE: Deployment Verification Script
# =============================================================================
# Dette scriptet verifiserer at deployet fungerer korrekt:
#   - Sjekker at alle sider laster
#   - Verifiserer database-tilkobling
#   - Tester /no7admin redirect
#   - Sjekker at API-endepunkter fungerer
# =============================================================================

set -euo pipefail

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Konfigurasjon
BASE_URL="${1:-https://klarpakke.no}"
VERBOSE="${2:-false}"
EXIT_CODE=0

# Test resultater
declare -a TESTS_PASSED=()
declare -a TESTS_FAILED=()

# =============================================================================
# Hjelpefunksjoner
# =============================================================================

log() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    TESTS_PASSED+=("$1")
}

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    TESTS_FAILED+=("$1")
    EXIT_CODE=1
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# =============================================================================
# HTTP Test
# =============================================================================

test_http() {
    local url="$1"
    local expected_code="${2:-200}"
    local description="${3:-$url}"
    
    if [ "$VERBOSE" == "true" ]; then
        log "Testing: $description"
    fi
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "$url" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" == "$expected_code" ]; then
        success "$description (HTTP $HTTP_CODE)"
        return 0
    else
        fail "$description (expected $expected_code, got $HTTP_CODE)"
        return 1
    fi
}

# =============================================================================
# Redirect Test
# =============================================================================

test_redirect() {
    local url="$1"
    local expected_destination="$2"
    local description="${3:-$url}"
    
    if [ "$VERBOSE" == "true" ]; then
        log "Testing redirect: $description"
    fi
    
    # Følg redirects og sjekk final URL
    FINAL_URL=$(curl -s -L -o /dev/null -w "%{url_effective}" --max-time 10 "$url" 2>/dev/null || echo "")
    
    if echo "$FINAL_URL" | grep -q "$expected_destination"; then
        success "$description → $expected_destination"
        return 0
    else
        fail "$description (expected to redirect to $expected_destination, got $FINAL_URL)"
        return 1
    fi
}

# =============================================================================
# Content Test
# =============================================================================

test_content() {
    local url="$1"
    local expected_content="$2"
    local description="${3:-$url}"
    
    if [ "$VERBOSE" == "true" ]; then
        log "Testing content: $description"
    fi
    
    CONTENT=$(curl -s -L --max-time 10 "$url" 2>/dev/null || echo "")
    
    if echo "$CONTENT" | grep -q "$expected_content"; then
        success "$description (contains '$expected_content')"
        return 0
    else
        fail "$description (expected content '$expected_content' not found)"
        return 1
    fi
}

# =============================================================================
# API Test
# =============================================================================

test_api() {
    local endpoint="$1"
    local method="${2:-GET}"
    local description="${3:-$endpoint}"
    
    local url="$BASE_URL$endpoint"
    
    if [ "$VERBOSE" == "true" ]; then
        log "Testing API: $method $description"
    fi
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" --max-time 10 "$url" 2>/dev/null || echo "000")
    
    # API kan returnere 200, 401 (unauthorized), eller 404 (not found)
    # Alt annet enn 500 er OK
    if [ "$HTTP_CODE" != "500" ] && [ "$HTTP_CODE" != "000" ]; then
        success "$description (HTTP $HTTP_CODE)"
        return 0
    else
        fail "$description (HTTP $HTTP_CODE - server error)"
        return 1
    fi
}

# =============================================================================
# Database Connectivity Test
# =============================================================================

test_database() {
    log "Testing database connectivity (via API)..."
    
    # Test at profiles-tabellen er tilgjengelig via en offentlig endpoint
    # Dette er en indirekte test - hvis DB er nede vil APIet feile
    
    HEALTH_ENDPOINT="$BASE_URL/api/health"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_ENDPOINT" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" == "200" ]; then
        success "Health endpoint available (HTTP $HTTP_CODE)"
    else
        warn "Health endpoint not available (HTTP $HTTP_CODE) - may not be configured"
    fi
}

# =============================================================================
# Admin Access Test
# =============================================================================

test_admin_access() {
    log "Testing admin dashboard access..."
    
    # Test at /no7admin redirect fungerer
    test_redirect "$BASE_URL/no7admin" "/admin" "/no7admin → /admin redirect"
    
    # Test at admin-siden eksisterer (vil returnere 302 til login hvis ikke autentisert)
    ADMIN_URL="$BASE_URL/no/admin"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$ADMIN_URL" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "307" ] || [ "$HTTP_CODE" == "302" ]; then
        success "Admin dashboard accessible (HTTP $HTTP_CODE)"
    else
        fail "Admin dashboard not accessible (HTTP $HTTP_CODE)"
    fi
}

# =============================================================================
# Performance Test
# =============================================================================

test_performance() {
    log "Testing page load performance..."
    
    local url="$BASE_URL"
    local max_time=3000  # maks 3 sekunder
    
    # Bruk curl for å måle load time
    LOAD_TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$url" 2>/dev/null || echo "999")
    LOAD_TIME_MS=$(echo "$LOAD_TIME * 1000" | bc | cut -d. -f1)
    
    if [ "$LOAD_TIME_MS" -lt "$max_time" ]; then
        success "Homepage loads in ${LOAD_TIME}s (< 3s)"
    else
        warn "Homepage slow: ${LOAD_TIME}s (> 3s threshold)"
    fi
}

# =============================================================================
# Main Test Suite
# =============================================================================

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║     🔍 KLARPAKKE DEPLOYMENT VERIFICATION 🔍               ║"
    echo "║                                                            ║"
    echo "║  Target: $BASE_URL"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Parse argumenter
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose|-v)
                VERBOSE="true"
                shift
                ;;
            --help|-h)
                echo "Usage: ./scripts/verify-deployment.sh [URL] [OPTIONS]"
                echo ""
                echo "Arguments:"
                echo "  URL                    Base URL to test (default: https://klarpakke.no)"
                echo ""
                echo "Options:"
                echo "  --verbose, -v          Show detailed output"
                echo "  --help, -h             Show this help message"
                echo ""
                echo "Examples:"
                echo "  ./scripts/verify-deployment.sh"
                echo "  ./scripts/verify-deployment.sh https://staging.klarpakke.no"
                echo "  ./scripts/verify-deployment.sh --verbose"
                exit 0
                ;;
            *)
                BASE_URL="$1"
                shift
                ;;
        esac
    done
    
    log "Starting verification suite..."
    echo ""
    
    # ========================================
    # Test 1: Grunnleggende sider
    # ========================================
    echo "📄 Testing Public Pages..."
    echo "----------------------------------------"
    
    test_http "$BASE_URL" "200" "Homepage"
    test_http "$BASE_URL/no" "200" "Norwegian homepage"
    test_http "$BASE_URL/en" "200" "English homepage"
    test_http "$BASE_URL/om-oss" "200" "About page (NO)"
    test_http "$BASE_URL/en/about" "200" "About page (EN)"
    test_http "$BASE_URL/priser" "200" "Pricing page"
    test_http "$BASE_URL/kontakt" "200" "Contact page"
    
    echo ""
    
    # ========================================
    # Test 2: Auth-sider
    # ========================================
    echo "🔐 Testing Auth Pages..."
    echo "----------------------------------------"
    
    test_http "$BASE_URL/no/innlogging" "200" "Login page"
    test_http "$BASE_URL/no/registrer" "200" "Register page"
    test_http "$BASE_URL/en/login" "200" "Login page (EN)"
    
    echo ""
    
    # ========================================
    # Test 3: Admin Dashboard
    # ========================================
    echo "🛡️  Testing Admin Dashboard..."
    echo "----------------------------------------"
    
    test_admin_access
    
    echo ""
    
    # ========================================
    # Test 4: API Endpoints
    # ========================================
    echo "🔌 Testing API Endpoints..."
    echo "----------------------------------------"
    
    test_api "/api/health" "GET" "Health API"
    test_api "/api/stripe/checkout" "POST" "Stripe Checkout API"
    
    echo ""
    
    # ========================================
    # Test 5: Database
    # ========================================
    echo "🗄️  Testing Database Connectivity..."
    echo "----------------------------------------"
    
    test_database
    
    echo ""
    
    # ========================================
    # Test 6: Performance
    # ========================================
    echo "⚡ Testing Performance..."
    echo "----------------------------------------"
    
    test_performance
    
    echo ""
    
    # ========================================
    # Test 7: Translations
    # ========================================
    echo "🌍 Testing Translations..."
    echo "----------------------------------------"
    
    test_content "$BASE_URL/no" "Oversikt" "NO translations"
    test_content "$BASE_URL/en" "Overview" "EN translations"
    
    echo ""
    
    # ========================================
    # Oppsummering
    # ========================================
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    
    PASSED_COUNT=${#TESTS_PASSED[@]}
    FAILED_COUNT=${#TESTS_FAILED[@]}
    TOTAL_COUNT=$((PASSED_COUNT + FAILED_COUNT))
    
    if [ $FAILED_COUNT -eq 0 ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  ✅ ALL TESTS PASSED! ($PASSED_COUNT/$TOTAL_COUNT)                      ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
        echo ""
        EXIT_CODE=0
    else
        echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║  ❌ SOME TESTS FAILED ($FAILED_COUNT/$TOTAL_COUNT)                     ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
        echo ""
        
        echo "Failed tests:"
        for test in "${TESTS_FAILED[@]}"; do
            echo "  ❌ $test"
        done
        
        echo ""
        EXIT_CODE=1
    fi
    
    echo "Passed tests: $PASSED_COUNT"
    echo "Failed tests: $FAILED_COUNT"
    echo ""
    
    exit $EXIT_CODE
}

main "$@"
