#!/bin/bash
# KLARPAKKE PRODUCTION HARDENING - ONE-CLICK DEPLOY
# Version: 2.0 - Robust error handling

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Error handler
error_handler() {
    local line=$1
    echo ""
    echo -e "${RED}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ DEPLOYMENT FAILED                                 ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${RED}Error occurred at line $line${NC}"
    echo ""
    echo "Rollback command:"
    echo "  git reset --hard HEAD"
    exit 1
}
trap 'error_handler $LINENO' ERR

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  KLARPAKKE PRODUCTION HARDENING - ONE-CLICK DEPLOY    ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "🚀 Deploying all improvements:"
echo "   ✅ i18n translations (landing CTA)"
echo "   ✅ Sentry error logging"
echo "   ✅ 5s request timeout"
echo "   ✅ Error throttling"
echo "   ✅ Mobile optimization"
echo "   ✅ SLA tracking"
echo "   ✅ Request tracing"
echo ""

cd /Users/taj/klarpakke

# Pre-flight: Check syntax in source files
echo "[0/9] Pre-flight syntax check..."
if grep -n ' { user }' src/app/api/paper-trading/balance/route.ENHANCED.ts > /dev/null 2>&1; then
    echo -e "${RED}   ❌ SYNTAX ERROR detected in route.ENHANCED.ts${NC}"
    echo "   Found invalid destructuring pattern: ' { user }'"
    echo "   Run: grep -n ' { user }' src/app/api/paper-trading/balance/route.ENHANCED.ts"
    exit 1
fi
if grep -n ' { user }' src/app/api/paper-trading/balance/route.ts > /dev/null 2>&1; then
    echo -e "${RED}   ❌ SYNTAX ERROR detected in route.ts${NC}"
    exit 1
fi
echo "   ✅ Syntax check passed"

echo ""
echo "[1/9] Create backups..."
cp src/components/dashboard/PaperTradingCard.tsx src/components/dashboard/PaperTradingCard.tsx.BACKUP-2026-03-28
cp src/app/api/paper-trading/balance/route.ts src/app/api/paper-trading/balance/route.ts.BACKUP-2026-03-28
echo "   ✅ Backups created"

echo ""
echo "[2/9] Apply enhanced component..."
cp src/components/dashboard/PaperTradingCard.ENHANCED.tsx src/components/dashboard/PaperTradingCard.tsx
echo "   ✅ Component deployed"

echo ""
echo "[3/9] Apply enhanced API..."
cp src/app/api/paper-trading/balance/route.ENHANCED.ts src/app/api/paper-trading/balance/route.ts
echo "   ✅ API deployed"

echo ""
echo "[4/9] Post-copy verification..."
echo "   Checking for syntax errors..."
if grep -n ' { user }' src/app/api/paper-trading/balance/route.ts > /dev/null 2>&1; then
    echo -e "${RED}   ❌ POST-COPY ERROR: Invalid destructuring detected${NC}"
    echo "   Reverting..."
    cp src/app/api/paper-trading/balance/route.ts.BACKUP-2026-03-28 src/app/api/paper-trading/balance/route.ts
    cp src/components/dashboard/PaperTradingCard.tsx.BACKUP-2026-03-28 src/components/dashboard/PaperTradingCard.tsx
    exit 1
fi
echo "   ✅ Post-copy check passed"

echo ""
echo "[5/9] Verify TypeScript..."
npx eslint src/components/dashboard/PaperTradingCard.tsx src/app/api/paper-trading/balance/route.ts --max-warnings 0 > /tmp/lint-result.txt 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}   ❌ LINT ERRORS:${NC}"
    cat /tmp/lint-result.txt
    exit 1
fi
echo "   ✅ Lint passed"

echo ""
echo "[6/9] Run tests..."
npm run test:unit > /tmp/test-result.txt 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}   ❌ TEST FAILURES:${NC}"
    grep -E "(FAIL|failed|Error)" /tmp/test-result.txt | head -10
    exit 1
fi
echo "   ✅ Tests passed"

echo ""
echo "[7/9] Stage files..."
git add messages/*/landing.json src/components/dashboard/PaperTradingCard.tsx src/app/api/paper-trading/balance/route.ts
echo "   ✅ Files staged"

echo ""
echo "[8/9] Create commit..."
git commit -m "feat(monitoring): production hardening - Sentry, timeout, mobile optimization

P0 Improvements:
- Sentry error logging with request tracing
- 5s fetch timeout (prevents stuck spinners)
- Error toast throttling (1 per 5s)

P1 Improvements:
- 3s SLA tracking on balance endpoint
- Mobile polling: 60s (vs 30s desktop)
- Request IDs for debugging
- Detailed error classification

Fixes:
- Add missing i18n: landing.stickyCTA
- Paper trading mobile experience

Fixes: KLA-MOBILE-STABILITY"
if [ $? -ne 0 ]; then
    echo -e "${RED}   ❌ COMMIT FAILED${NC}"
    exit 1
fi
echo "   ✅ Commit created"

echo ""
echo "[9/9] Push to main..."
git push origin main
if [ $? -ne 0 ]; then
    echo -e "${RED}   ❌ PUSH FAILED${NC}"
    exit 1
fi
echo "   ✅ Pushed to main"

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  ✅ DEPLOYMENT COMPLETE                               ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "📊 Next: Monitor these in 5 minutes"
echo ""
echo "   GitHub Actions: https://github.com/tajlive/KP/actions"
echo "   Staging Build: Check for ✅ passing"
echo ""
echo "   Sentry: https://sentry.io/organizations/klarpakke/"
echo "   Monitor for errors (should be < 1%)"
echo ""
echo "   When staging ✅ passes:"
echo "   1. Test on real mobile device"
echo "   2. Verify balance loads < 3s"
echo "   3. Merge staging → production"
echo ""
echo "📚 Documentation:"
echo "   - PRODUCTION-READINESS-SUMMARY.md (this deployment)"
echo "   - IMPLEMENTATION-P0-P1-FINAL.md (detailed guide)"
echo ""
echo "🆘 Rollback if needed:"
echo "   git revert <commit-hash>"
echo "   (Backups: *.BACKUP-2026-03-28)"
echo ""
echo "⏱️  Timeline: Staging deploy ~5min, full rollout ~30min"
echo ""
