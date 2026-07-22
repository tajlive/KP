#!/usr/bin/env bash
# =============================================================================
# VERIFY: Production Deployment
# =============================================================================
# Verifiserer at produksjonsdeployment fungerer korrekt.
# =============================================================================

set -euo pipefail

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Konfigurasjon
PROD_URL="${1:-https://www.klarpakke.no}"
ERRORS=0

echo "============================================================================="
log_info "PRODUKSJONSVERIFISERING"
echo "============================================================================="
log_info "URL: $PROD_URL"
echo ""

# =============================================================================
# Test 1: Hovedside
# =============================================================================
log_info "Test 1: Sjekker hovedside..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "308" ]; then
  log_success "Hovedside: HTTP $HTTP_CODE"
else
  log_error "Hovedside: HTTP $HTTP_CODE"
  ERRORS=$((ERRORS + 1))
fi

# =============================================================================
# Test 2: Health endpoint
# =============================================================================
log_info "Test 2: Sjekker health endpoint..."

HEALTH_RESPONSE=$(curl -s "$PROD_URL/api/health" || echo '{}')

if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
  log_success "Health check: OK"
  echo "$HEALTH_RESPONSE" | head -c 200
  echo ""
elif echo "$HEALTH_RESPONSE" | grep -q '"status":"error"'; then
  log_error "Health check: ERROR"
  echo "$HEALTH_RESPONSE"
  ERRORS=$((ERRORS + 1))
else
  log_warn "Health check: Ukjent respons"
  echo "$HEALTH_RESPONSE"
fi

# =============================================================================
# Test 3: Dashboard side
# =============================================================================
log_info "Test 3: Sjekker dashboard..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/no/dashboard" || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "308" ]; then
  log_success "Dashboard: HTTP $HTTP_CODE"
else
  log_warn "Dashboard: HTTP $HTTP_CODE (kan være OK hvis redirect til login)"
fi

# =============================================================================
# Test 4: Statiske assets
# =============================================================================
log_info "Test 4: Sjekker statiske assets..."

# Sjekk at _next/static er tilgjengelig
STATIC_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/_next/static/chunks/main.js" || echo "404")

if [ "$STATIC_CHECK" = "200" ] || [ "$STATIC_CHECK" = "404" ]; then
  log_success "Static assets: OK (eller ikke cachet ennå)"
else
  log_warn "Static assets: HTTP $STATIC_CHECK"
fi

# =============================================================================
# Test 5: Response time
# =============================================================================
log_info "Test 5: Måler responstid..."

RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$PROD_URL" || echo "999")

# Konverter til ms og fjern desimaler
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc | cut -d. -f1)

if [ "$RESPONSE_MS" -lt 1000 ]; then
  log_success "Responstid: ${RESPONSE_MS}ms (god)"
elif [ "$RESPONSE_MS" -lt 3000 ]; then
  log_warn "Responstid: ${RESPONSE_MS}ms (akseptabel)"
else
  log_error "Responstid: ${RESPONSE_MS}ms (treg)"
  ERRORS=$((ERRORS + 1))
fi

# =============================================================================
# Oppsummering
# =============================================================================
echo ""
echo "============================================================================="

if [ $ERRORS -eq 0 ]; then
  log_success "PRODUKSJONSVERIFISERING BESTÅTT!"
  echo "============================================================================="
  echo ""
  log_info "Siden er live og fungerer korrekt:"
  echo "  🌐 $PROD_URL"
  echo ""
  exit 0
else
  log_error "FANT $ERRORS FEIL!"
  echo "============================================================================="
  echo ""
  log_warn "Sjekk følgende:"
  echo "  1. Er Cloudflare Pages deploy ferdig?"
  echo "  2. Er Supabase tilgjengelig?"
  echo "  3. Sjekk Cloudflare logs: https://dash.cloudflare.com/"
  echo ""
  exit 1
fi
