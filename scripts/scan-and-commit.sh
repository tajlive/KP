#!/bin/bash
set -e
cd /Users/taj/klarpakke

echo "=== Full scan for remaining schema column mismatches ==="
# Sjekk alle .from() + .eq() kombinasjoner som kan bryte Vercel-build
grep -rn '.eq("session_id"' src/app/api/ 2>/dev/null || echo "OK: ingen session_id i API-routes"
grep -rn '.eq("config_id"' src/app/api/ 2>/dev/null || echo "OK: ingen config_id"
grep -rn '.eq("portfolio_id"' src/app/api/ 2>/dev/null | head -5 || echo "OK: ingen portfolio_id"
grep -rn 'from("positions")' src/app/api/ 2>/dev/null | head -10

echo ""
echo "=== git status ==="
git status --short

echo ""
echo "=== Committer og pusher ==="
git add src/app/api/trading/conditional-order/route.ts
git commit -m "fix(types): positions table has no session_id — use user_id instead

positions schema: id, user_id, portfolio_id, symbol, quantity, ...
Remove invalid .eq(session_id) which caused Vercel type error on positions query."
git push origin main
echo "=== DONE ==="
