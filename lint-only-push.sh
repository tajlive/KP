#!/bin/bash

echo "==========================================="
echo "  KLARPAKKE LINT-ONLY PUSH  $(date +%Y-%m-%d\ %H:%M)"
echo "==========================================="

# Reset everything first
git reset HEAD

# Stage ONLY the lint-fixed files
git add .storybook/mocks/next-intl-server.ts
git add .storybook/mocks/next-intl.ts
git add e2e/fixtures/test-users.ts
git add e2e/performance/lighthouse.spec.ts
git add src/components/paper-trading/PaperTradingSessionDetail.tsx

echo ""
echo "=== STAGED FILES ==="
git diff --cached --name-only

# Run lint check
echo ""
echo "=== ESLINT CHECK ==="
npm run lint

if [ $? -ne 0 ]; then
  echo "❌ ESLint failed. Aborting."
  exit 1
fi

echo ""
echo "✅ All checks passed. Committing..."

# Commit
git commit -m "chore: fix 13 ESLint errors + warnings (lint-only)"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Commit OK"
  echo ""
  echo "=== PUSH ==="
  git push origin main
  echo ""
  echo "✅ LINT-ONLY PUSH COMPLETE"
fi
