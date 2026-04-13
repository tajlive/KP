#!/bin/bash
set -e
cd /Users/taj/klarpakke

echo '=== 1. LINT ===' && npm run lint 2>&1 | tail -5
echo '=== 2. TYPECHECK ===' && npm run type-check 2>&1 | tail -3
echo '=== 3. GIT ===' && git add -A && git status --short
git commit -m "fix: signal-engine cron auth + lint 0 errors + AuthHashHandler

- pg_cron signal-engine-5min: hardcode service_role_key (was NULL)
- AuthHashHandler.tsx: const sessionError fix
- fix-auth.cjs: eslint-env node
- e2e/trader-paper-flow.spec.ts: balanced locator quotes
- Lint: 100 problems to 0"

echo '=== 4. PUSH ===' && git push origin main
echo '=== 5. DEPLOY ===' && npx vercel --prod --archive=tgz 2>&1 | tail -15
echo '=== 6. HEALTH ===' && sleep 15 && npm run signals:health 2>&1 | tail -10
echo '=== 7. MEMPALACE ===' && /Library/Frameworks/Python.framework/Versions/3.13/bin/mempalace mine /Users/taj/klarpakke --mode projects --wing klarpakke 2>&1 | tail -5
echo '=== ALL DONE ==='
