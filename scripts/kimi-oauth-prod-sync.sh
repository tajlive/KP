#!/bin/bash
# Cron-wrapper for kimi-oauth-sync (prod-push av Kimi Code OAuth-token).
# Hermes-cron kjører .sh via bash — PATH må inneholde node/npx.
export PATH="/Users/taj/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd /Users/taj/klarpakke || exit 1
exec node scripts/kimi-oauth-sync.mjs --prod
