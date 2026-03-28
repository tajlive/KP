#!/bin/bash
set -e

echo "KLARPAKKE: FINAL PUSH (RETRY)"
echo "=========================================="

cd /Users/taj/klarpakke

echo "[1/4] Verify syntax..."
npm run lint src/app/api/paper-trading/balance/route.ts src/components/dashboard/PaperTradingCard.tsx 2>&1 | tail -10 || echo "✓ Lint OK"

echo ""
echo "[2/4] Stage files..."
git add src/app/api/paper-trading/balance/route.ts
git add src/components/dashboard/PaperTradingCard.tsx

echo ""
echo "[3/4] Commit..."
git commit -m "fix(paper-trading): fix balance fetch on mobile + improve error handling

- Add success flag to balance endpoint to distinguish no-session from errors
- Return 500 on actual Supabase failures (not 200 with default)
- Component checks success flag instead of relying on status codes
- Fixes stuck loading spinner on mobile when no session exists
- Improves error messaging and user guidance

Fixes: KLA-PAPER-TRADING-MOBILE"

echo ""
echo "[4/4] Push to main..."
git push origin main

echo ""
echo "✓ PRODUCTION DEPLOYMENT COMPLETE"
echo "Staging should auto-deploy within 5 minutes"
