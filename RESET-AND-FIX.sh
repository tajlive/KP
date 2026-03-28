#!/bin/bash
set -e

echo "=========================================="
echo "RESET BALANCE FILE FROM GIT"
echo "=========================================="

cd /Users/taj/klarpakke

echo "[1/3] Reset balance route from git..."
git checkout HEAD -- src/app/api/paper-trading/balance/route.ts

echo "[2/3] Verify file is valid..."
head -60 src/app/api/paper-trading/balance/route.ts | tail -20

echo ""
echo "[3/3] Status..."
git status src/app/api/paper-trading/balance/route.ts

echo ""
echo "✅ File reset to git version (no staged changes)"
echo "Now ready to apply incremental fix in Cursor"
