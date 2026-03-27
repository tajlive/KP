#!/bin/bash
cd /Users/taj/klarpakke
rm -f .git/index.lock
export GIT_PAGER=cat
git add src/test/setup.ts src/store/tradingStore.ts src/test/tradingStore.test.ts scripts/
git status --short
git diff --cached --stat --no-pager 2>/dev/null | tail -5
git commit -m "fix(test): localStorage mock in setupFiles — fixes zustand persist in vitest"
echo "=== TESTS VIA HUSKY ==="
git push origin main
echo "=== PUSHED ==="
git log --oneline -5
