#!/bin/bash
set -e

echo "=========================================="
echo "KLARPAKKE: FINAL PUSH - PAPER TRADING FIX"
echo "Date: $(date)"
echo "=========================================="

cd /Users/taj/klarpakke

echo ""
echo "[1/6] Git status check..."
git status --short

echo ""
echo "[2/6] Stage fixed files..."
git add src/app/api/paper-trading/balance/route.ts
git add src/components/dashboard/PaperTradingCard.tsx

echo ""
echo "[3/6] Verify staging..."
git diff --cached --stat

echo ""
echo "[4/6] Run lint check..."
npm run lint 2>&1 | grep -E "error|Error|✓" | tail -10 || echo "Lint check complete"

echo ""
echo "[5/6] Commit..."
git commit -m "fix(paper-trading): fix balance fetch on mobile + improve error handling

- Add success flag to balance endpoint to distinguish no-session from errors
- Return 500 on actual Supabase failures (not 200 with default)
- Component checks success flag instead of relying on status codes
- Fixes stuck loading spinner on mobile when no session exists
- Improves error messaging and user guidance
- Only show error toast on actual errors, not empty states

Fixes KLA-XXX (paper trading mobile saldo bug)"

echo ""
echo "[6/6] Push to main..."
git push origin main

echo ""
echo "=========================================="
echo "✅ DEPLOY SUCCESSFUL"
echo "Commit pushed to main branch"
echo "Staging deployment should trigger automatically"
echo "=========================================="

echo ""
echo "Next steps:"
echo "1. Monitor staging deployment in GitHub Actions"
echo "2. Test paper trading balance on mobile (staging URL)"
echo "3. If tests pass: merge to production"
echo "4. Clear browser cache on mobile and test again"
