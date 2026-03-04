#!/usr/bin/env bash
set -euo pipefail

# =====================================================
# CI PRE-DEPLOY TEST SCRIPT
# =====================================================
# Kjører tester mot lokal build (out/), IKKE produksjon
# Sikrer at vi tester det vi faktisk skal deploye
# 
# Bruk: npm run test:ci (i GitHub Actions)
# =====================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

error() { echo -e "${RED}❌ $1${NC}" >&2; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

echo "=================================="
echo "🧪 CI PRE-DEPLOY TEST"
echo "=================================="
echo ""

# 1. Sjekk at build finnes
info "[1/5] Sjekker at build finnes..."
if [ ! -d ".vercel/output/static" ] || [ ! -f ".vercel/output/static/index.html" ]; then
    error "Build mangler! Kjør 'npm run pages:build' først."
    exit 1
fi
success "Build funnet (.vercel/output/static/)"

# 2. Lint
echo ""
info "[2/5] Kjører lint..."
if ! npm run lint; then
    error "Lint feilet"
    exit 1
fi
success "Lint bestått"

# 3. TypeScript check
echo ""
info "[3/5] Kjører TypeScript sjekk..."
if ! npm run type-check; then
    error "TypeScript feil funnet"
    exit 1
fi
success "TypeScript OK"

# 4. 🛡️ Guard: Sjekk at tester finnes (viktig!)
echo ""
info "[4/5] 🛡️ Guard: Sjekker at Playwright-tester finnes..."
LIST_OUT=$(mktemp)
trap 'rm -f "$LIST_OUT"' EXIT

if ! npx playwright test --list > "$LIST_OUT" 2>&1; then
    error "Klarte ikke å liste Playwright-tester"
    cat "$LIST_OUT"
    exit 1
fi

# Sjekk at vi har >0 tester
TEST_COUNT=$(grep -oE "[0-9]+ test" "$LIST_OUT" | grep -oE "[0-9]+" || echo "0")
if [ "$TEST_COUNT" -eq 0 ]; then
    error "0 Playwright-tester funnet! Sjekk grep/grepInvert i config."
    cat "$LIST_OUT"
    exit 1
fi

success "$TEST_COUNT tester funnet"

# 5. Kjør tester mot lokal build (med webServer)
echo ""
info "[5/5] Kjører Playwright mot lokal build..."
info "Server startes automatisk fra .vercel/output/static/ mappen"
echo ""

# Bruk CI-config som starter lokal server fra out/
if ! npx playwright test --config=playwright.config.ci.ts; then
    error "Playwright-tester feilet"
    echo ""
    echo "Se test-results/ for detaljer"
    exit 1
fi

echo ""
echo "=================================="
success "CI PRE-DEPLOY TEST BESTÅTT!"
echo "=================================="
echo ""
echo "Klar for deploy ✅"
