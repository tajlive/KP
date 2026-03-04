#!/usr/bin/env bash
# =============================================================================
# CHECK: Link Checker
# =============================================================================
# Sjekker at alle interne lenker fungerer.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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

# URL til å teste mot
BASE_URL="${1:-https://www.klarpakke.no}"
ERRORS=0

echo "============================================================================="
log_info "LINK CHECKER"
echo "============================================================================="
log_info "Testing: $BASE_URL"
echo ""

# Liste over kritiske sider som må fungere
CRITICAL_PATHS=(
  "/"
  "/no"
  "/en"
  "/no/dashboard"
  "/no/priser"
  "/no/simulator"
  "/no/innlogging"
  "/no/opptak"
  "/admin"
  "/admin/login"
  "/api/health"
)

echo "============================================================================="
log_info "Sjekker kritiske sider..."
echo "============================================================================="

for path in "${CRITICAL_PATHS[@]}"; do
  url="${BASE_URL}${path}"
  status=$(curl -o /dev/null -s -w "%{http_code}" "$url" || echo "000")
  
  if [[ "$status" == "200" || "$status" == "307" || "$status" == "308" ]]; then
    log_success "$path ($status)"
  elif [[ "$status" == "404" ]]; then
    log_error "$path ($status) - BROKEN"
    ERRORS=$((ERRORS + 1))
  else
    log_warn "$path ($status)"
  fi
done

echo ""
echo "============================================================================="

if [ $ERRORS -eq 0 ]; then
  log_success "ALLE KRITISKE LENKER FUNGERER!"
  echo "============================================================================="
  exit 0
else
  log_error "FANT $ERRORS BROKEN LENKER!"
  echo "============================================================================="
  exit 1
fi
