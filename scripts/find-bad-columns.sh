#!/bin/bash
cd /Users/taj/klarpakke
echo '=== KNOWN BAD COLUMNS ==='
grep -rn 'is_marketplace_listed\|copy_source_session_id\|config_id\|paused_at\|pause_reason\|stop_reason\|risk_config\|status.*pause\|status.*resume\|status.*stop' \
  src/app/api/ --include='*.ts' | grep -v '.test.' | grep -v node_modules
echo ''
echo '=== ALL .eq() ON STRATEGIES ==='
grep -rn 'from("strategies")' -A 10 src/app/api/ --include='*.ts' | grep '\.eq(' | grep -v '.test.'
echo ''
echo '=== ALL .eq() ON TRADING_SESSIONS ==='
grep -rn 'from("trading_sessions")' -A 10 src/app/api/ --include='*.ts' | grep '\.eq(' | grep -v '.test.'
echo ''
echo '=== NEXT BUILD TYPE ERRORS ==='
npx next build 2>&1 | grep 'Type error' | head -20
