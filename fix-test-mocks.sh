#!/bin/bash
cd /Users/taj/klarpakke
git add \
  src/lib/trading/__tests__/confluent-signal-engine.test.ts \
  src/components/dashboard/__tests__/AutoTradingConfigCard.test.tsx

git commit -m "fix(tests): add missing afterEach import + replace stub test with 7 proper unit tests"
git push
echo "=== DONE ==="
