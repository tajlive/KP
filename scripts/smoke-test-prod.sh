#!/bin/bash
set -euo pipefail

# =============================================================================
# Smoke Test Script for Klarpakke Production
# Verifiserer at kritiske ruter fungerer etter deploy
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Farger for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Konfigurasjon
BASE_URL="${SMOKE_TEST_URL:-https://www.klarpakke.no}"
TIMEOUT=30

cd "${PROJECT_ROOT}"

log_info "Kjører smoke-tester mot: ${BASE_URL}"

ERRORS=0

# Funksjon for å sjekke HTTP status
check_route() {
    local route="$1"
    local expected="$2"
    local description="$3"
    
    log_info "Tester: ${route} (${description})"
    
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "${TIMEOUT}" "${BASE_URL}${route}" 2>&1 || echo "000")
    
    # Sjekk om status matcher forventet
    if [ "${http_code}" == "${expected}" ]; then
        log_success "${route} → ${http_code} ✓"
        return 0
    else
        log_error "${route} → ${http_code} (forventet ${expected}) ✗"
        ((ERRORS++)) || true
        return 1
    fi
}

# Funksjon for å sjekke at redirect fungerer
check_redirect() {
    local route="$1"
    local expected_contains="$2"
    local description="$3"
    
    log_info "Tester redirect: ${route} (${description})"
    
    local redirect_url
    redirect_url=$(curl -s -o /dev/null -w "%{redirect_url}" --max-time "${TIMEOUT}" "${BASE_URL}${route}" 2>&1 || echo "")
    
    if echo "${redirect_url}" | grep -q "${expected_contains}"; then
        log_success "${route} → redirect til ${expected_contains} ✓"
        return 0
    else
        # Sjekk HTTP code for redirect
        local http_code
        http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "${TIMEOUT}" "${BASE_URL}${route}" 2>&1 || echo "000")
        if [ "${http_code}" == "301" ] || [ "${http_code}" == "302" ] || [ "${http_code}" == "307" ] || [ "${http_code}" == "308" ]; then
            log_success "${route} → ${http_code} redirect ✓"
            return 0
        fi
        log_error "${route} → ingen redirect funnet (fikk: ${redirect_url}) ✗"
        ((ERRORS++)) || true
        return 1
    fi
}

log_info "================================================"
log_info "KRITISKE RUTER (MÅ VÆRE 200)"
log_info "================================================"

# Kritiske offentlige sider
check_route "/" "200" "Forside"
check_route "/no/" "200" "Norsk forside"
check_route "/priser" "200" "Prisside"
check_route "/kurs" "200" "Kursoversikt"
check_route "/simulator" "200" "Simulator"
check_route "/kalkulator" "200" "Kalkulator"
check_route "/innlogging" "200" "Innlogging"
check_route "/om-universitetet" "200" "Om oss"
check_route "/personvern" "200" "Personvern"
check_route "/vilkar" "200" "Vilkår"
check_route "/kontakt" "200" "Kontakt"

log_info ""
log_info "================================================"
log_info "BETA/SPECIAL RUTER"
log_info "================================================"

# Beta-ruter (kan være 302 redirect hvis auth kreves)
check_route "/beta-testing" "200" "Beta landing"

log_info ""
log_info "================================================"
log_info "REDIRECTS"
log_info "================================================"

# Auth redirects
check_redirect "/dashboard" "innlogging" "Dashboard redirect til login"

log_info ""
log_info "================================================"
log_info "API RUTER (hvis tilgjengelige)"
log_info "================================================"

# API helse-sjekk (hvis den finnes)
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${BASE_URL}/api/health" 2>&1 || echo "404")
if [ "${API_STATUS}" == "200" ]; then
    log_success "/api/health → 200 ✓"
else
    log_warn "/api/health → ${API_STATUS} (kan være OK hvis ikke implementert)"
fi

log_info ""
log_info "================================================"

if [ ${ERRORS} -eq 0 ]; then
    log_success "Alle smoke-tester bestått!"
    exit 0
else
    log_error "${ERRORS} tester feilet"
    exit 1
fi
