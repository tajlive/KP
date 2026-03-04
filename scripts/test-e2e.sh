#!/usr/bin/env bash
# =============================================================================
# TEST: E2E Tests with Playwright
# =============================================================================
# Kjører Playwright E2E-tester.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)

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

echo "============================================================================="
log_info "E2E TESTS (Playwright)"
echo "============================================================================="

cd "$PROJECT_ROOT"

# Sjekk at Playwright er installert
if ! command -v npx playwright &> /dev/null; then
  log_info "Installerer Playwright..."
  npm install -D @playwright/test
  npx playwright install
fi

# Bygg først
log_info "Bygger applikasjonen..."
npm run build

# Start Next.js i bakgrunnen
log_info "Starter Next.js server..."
npm run start &
SERVER_PID=$!

# Cleanup function
cleanup() {
  log_info "Stopper server..."
  kill $SERVER_PID 2>/dev/null || true
  wait $SERVER_PID 2>/dev/null || true
}
trap cleanup EXIT

# Vent på at server starter
log_info "Venter på at server starter..."
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null; then
    log_success "Server klar!"
    break
  fi
  sleep 1
done

# Kjør tester
log_info "Kjører Playwright-tester..."
if npx playwright test; then
  log_success "E2E-tester bestått!"
else
  log_error "E2E-tester feilet!"
  exit 1
fi

echo "============================================================================="
log_success "ALLE E2E-TESTER BESTÅTT!"
echo "============================================================================="
