#!/bin/bash
set -e
cd /Users/taj/klarpakke
export GIT_PAGER=cat
git add src/test/tradingStore.test.ts scripts/commit-and-push-today.sh scripts/push-fix.sh
git commit -m "test: add localStorage mock for zustand persist in vitest"
git push origin main
echo "=== PUSH FERDIG ==="
git log --oneline -3
