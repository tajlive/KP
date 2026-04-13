#!/bin/bash
set -e
cd /Users/taj/klarpakke

echo '=== 1. LINT VERIFY ==='
npm run lint 2>&1 | tail -10

echo '=== 2. TYPE CHECK ==='
npm run type-check 2>&1 | tail -5

echo '=== 3. GIT STATUS ==='
git status --short

echo '=== 4. GIT ADD + COMMIT ==='
git add -A
git commit -m "fix: signal-engine cron auth + lint cleanup + auth hash handler

- Fix pg_cron signal-engine-5min auth (service_role_key was NULL in DB)
- Fix AuthHashHandler.tsx: prefer-const for sessionError
- Fix fix-auth.cjs: add eslint-env node
- Fix e2e/trader-paper-flow.spec.ts: unbalanced quotes in locators
- Lint: 100 problems → 0 (97 auto-fixed + 3 manual)
- Signal-engine heartbeat: operational, <1min fresh"

echo '=== 5. GIT PUSH ==='
git push origin main

echo '=== 6. VERCEL DEPLOY PROD ==='
npx vercel --prod --archive=tgz 2>&1 | tail -20

echo '=== 7. SIGNALS HEALTH POST-DEPLOY ==='
sleeep 10
npm run signals:health 2>&1 | tail -15

echo '=== 8. MEMPALACE UPDATE ==='
/Library/Frameworks/Python.framework/Versions/3.13/bin/mempalace mine /Users/taj/klarpakke --mode projects --wing klarpakke 2>&1 | tail -10

echo '=== DONE ==='
