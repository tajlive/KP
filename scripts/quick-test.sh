#!/bin/bash
# Quick Test - Nivå 1+2: Rask validering uten full build
# Brukes av KIMI for iterativ utvikling

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Quick Test (Nivå 1+2)"
echo "═══════════════════════════════════════════════════════════"

# ═══════════════════════════════════════════════════════════
# NIVÅ 1: INSTANT CHECKS (5 sek)
# ═══════════════════════════════════════════════════════════
echo ""
echo "📋 NIVÅ 1: Instant Config Checks"
echo "───────────────────────────────────────────────────────────"

# 1. Config syntaks
echo -n "📝 next.config.mjs syntaks... "
if node --check next.config.mjs 2>/dev/null; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FEIL${NC}"
    exit 1
fi

# 2. TypeScript config (sjekk at filen eksisterer)
echo -n "📝 tsconfig.json eksisterer... "
if [ -f "tsconfig.json" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FEIL${NC}"
    exit 1
fi

# 3. Middleware/proxy sjekk
echo -n "📝 middleware/proxy filer... "
if [ -f "src/proxy.ts" ] && [ ! -f "src/middleware.ts" ]; then
    echo -e "${GREEN}✅ OK${NC} (proxy.ts eksisterer, middleware.ts fjernet)"
elif [ -f "src/middleware.ts" ] && [ -f "src/proxy.ts" ]; then
    echo -e "${YELLOW}⚠️  ADVARSEL${NC} (begge eksisterer - Next.js 16 feil!)"
    exit 1
else
    echo -e "${RED}❌ FEIL${NC} (mangler proxy.ts)"
    exit 1
fi

# ═══════════════════════════════════════════════════════════
# NIVÅ 2: PRE-DEPLOY (30 sek)
# ═══════════════════════════════════════════════════════════
echo ""
echo "📋 NIVÅ 2: Pre-Deploy Checks"
echo "───────────────────────────────────────────────────────────"

# TypeScript (rask sjekk uten emit)
echo "🧪 TypeScript type check..."
if npm run type-check --silent 2>&1 | grep -q "error TS"; then
    echo -e "${RED}❌ TypeScript feil funnet${NC}"
    npm run type-check
    exit 1
else
    echo -e "${GREEN}✅ TypeScript OK (0 errors)${NC}"
fi

# Unit tester (kjapt subsett)
echo "🧪 Unit tester (rask modus)..."
if npm run test:unit -- --run --reporter=basic 2>&1 | tail -5 | grep -q "failed"; then
    echo -e "${RED}❌ Tester feilet${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Tester OK${NC}"
fi

# ═══════════════════════════════════════════════════════════
# OPPSUMMERING
# ═══════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}🎉 SUCCESS - Klar for git push!${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Neste steg:"
echo "  1. git add -A"
echo "  2. git commit -m 'din melding'"
echo "  3. git push origin main"
echo ""
echo "Vercel vil automatisk kjøre full bygg etter push."
echo ""
