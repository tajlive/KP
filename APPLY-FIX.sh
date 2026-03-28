#!/bin/bash
# Apply paper trading saldo bug fix

echo "=========================================="
echo "APPLYING PAPER TRADING SALDO BUG FIX"
echo "=========================================="

cd /Users/taj/klarpakke

echo ""
echo "[1/3] Backup originals..."
cp src/app/api/paper-trading/balance/route.ts src/app/api/paper-trading/balance/route.ts.BACKUP
cp src/components/dashboard/PaperTradingCard.tsx src/components/dashboard/PaperTradingCard.tsx.BACKUP

echo "[2/3] Apply endpoint fix..."
mv src/app/api/paper-trading/balance/route.ts.FIXED src/app/api/paper-trading/balance/route.ts

echo "[3/3] Verify lint..."
npm run lint -- src/app/api/paper-trading/balance/route.ts src/components/dashboard/PaperTradingCard.tsx 2>&1 | head -20 || true

echo ""
echo "=========================================="
echo "Next: Apply component fix in Cursor"
echo "File: src/components/dashboard/PaperTradingCard.tsx"
echo "See KIMI-2.5-PAPER-TRADING-FIX.txt for changes"
echo "=========================================="
