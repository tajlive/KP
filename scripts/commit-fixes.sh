#!/bin/bash
set -e
cd /Users/taj/klarpakke

git add 'src/app/api/bots/[id]/actions/route.ts'
git add src/app/api/marketplace/subscribe/route.ts
git add src/app/api/dashboard/bot-status/route.ts
git add src/app/api/cron/tick/route.ts
git add scripts/

git commit -m "fix(types): align API routes with current Supabase schema

- marketplace/subscribe: Insert trading_sessions only, user_strategy_id=null
- dashboard/bot-status: Use is_active (not status) for strategies query
- cron/tick: Read risk_config from strategy_config (not separate column)
- bots/actions: Lowercase ACTIVE -> active for trading_sessions queries"

git push origin main
