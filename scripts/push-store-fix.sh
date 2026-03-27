#!/bin/bash
cd /Users/taj/klarpakke
rm -f .git/index.lock
export GIT_PAGER=cat
git add src/store/tradingStore.ts src/test/tradingStore.test.ts
git status --short
git commit -m "fix(store): SSR-safe localStorage for zustand persist, fix vitest"
git push origin main
echo "=== PUSH OK ==="
git log --oneline -4
