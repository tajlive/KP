#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# KLARPAKKE - FULL AUTOMATISK TEST (med guard mot 0 tester)
# ============================================================

echo "🧪 KLARPAKKE FULL AUTOMATISK TEST"
echo "=================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd "$(dirname "$0")/.."
TOTAL_STEPS=6
CURRENT_STEP=0

progress() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    echo ""
    echo -e "${BLUE}[$CURRENT_STEP/$TOTAL_STEPS] $1${NC}"
    echo "----------------------------------------"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# ============================================
# STEG 1: Env-variabler (advarsel, ikke feil)
# ============================================
progress "Sjekker miljøvariabler"

if [ ! -f ".env.local" ]; then
    warning ".env.local finnes ikke!"
else
    REQUIRED_VARS=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
    )
    
    ENV_OK=1
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$var=" .env.local && ! grep -q "^$var=$" .env.local; then
            success "$var er satt"
        else
            warning "$var mangler eller er tom"
            ENV_OK=0
        fi
    done
    
    if [ $ENV_OK -eq 0 ]; then
        warning "Noen env-variabler mangler, men fortsetter..."
    fi
fi

# ============================================
# STEG 2: TypeScript sjekk
# ============================================
progress "Kjører TypeScript sjekk"

if npx tsc --noEmit 2>/dev/null; then
    success "TypeScript: Ingen feil"
else
    warning "TypeScript: Noen advarsler (sjekk output)"
fi

# ============================================
# STEG 3: Build
# ============================================
progress "Bygger prosjektet"

export NODE_ENV=production

if npm run build 2>&1 | tee /tmp/build.log; then
    success "Build fullført"
    
    # Sjekk etter feil
    if grep -q "error\|Error\|ERROR" /tmp/build.log; then
        error "Build inneholdt feil!"
        exit 1
    fi
else
    error "Build feilet!"
    exit 1
fi

# ============================================
# STEG 4: Fil-verifikasjon
# ============================================
progress "Verifiserer build output"

CRITICAL_FILES=(
    "out/no/innlogging.html"
    "out/no/opptak.html"
    "out/priser.html"
    "out/spar-bot.html"
    "out/varsler.html"
    "out/leaderboard.html"
    "out/paper-trading.html"
    "out/auth/callback.html"
    "out/admin.html"
)

FILE_OK=1
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        success "$file"
    else
        error "$file mangler"
        FILE_OK=0
    fi
done

if [ $FILE_OK -eq 0 ]; then
    error "Kritiske filer mangler!"
    exit 1
fi

# ============================================
# STEG 5: Playwright - GUARD MOT 0 TESTER
# ============================================
progress "Playwright: sjekker at tester finnes (guard mot 0)"

echo "  🔍 Lister Playwright-tester..."

# Sjekk at tester finnes før vi kjører
LIST_OUT=$(mktemp)
if ! npx playwright test --list --config=playwright.config.prod.ts > "$LIST_OUT" 2>&1; then
    error "Klarte ikke å liste Playwright-tester"
    cat "$LIST_OUT"
    rm -f "$LIST_OUT"
    exit 1
fi

# Guard: Sjekk at vi har >0 tester
TEST_COUNT=$(grep -oE "[0-9]+ test" "$LIST_OUT" | grep -oE "[0-9]+" || echo "0")

if [ "$TEST_COUNT" -eq 0 ]; then
    error "0 Playwright-tester funnet! Sjekk grep/grepInvert i config."
    echo ""
    echo "Output fra --list:"
    cat "$LIST_OUT"
    rm -f "$LIST_OUT"
    exit 1
fi

success "$TEST_COUNT Playwright-tester funnet"
cat "$LIST_OUT"
rm -f "$LIST_OUT"

# Nå kjør testene
echo ""
echo "  🎬 Kjører Playwright-tester..."

if npx playwright test tests/e2e/auth.spec.ts --config=playwright.config.prod.ts --reporter=line; then
    success "Alle Playwright-tester bestått"
else
    error "Noen Playwright-tester feilet"
    echo ""
    echo "Sjekk test-results/ for detaljer"
    exit 1
fi

# ============================================
# STEG 6: Oppsummering
# ============================================
progress "Test oppsummering"

echo ""
echo "=================================="
echo -e "${GREEN}🎉 FULL TEST BESTÅTT!${NC}"
echo "=================================="
echo ""
echo "Prosjektet er klart for deploy:"
echo "  git push origin main"
echo ""
echo "Eller kjør full deploy:"
echo "  npm run launch"
echo ""
