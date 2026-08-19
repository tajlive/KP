#!/bin/bash
# Update coin_prices table via /api/cron/sync-prices (Kraken/OKX — Binance er
# geo-blokkert i EU og binance-proxy er død).
# Called by Hermes cron every 5 minutes.
# 2026-08-19: Erstatter gammel Binance-proxy-vei (BINANCE_PROXY_SECRET fjernet
# fra .env.local → 467 stille feil). Samme kilde som pg_cron 1165.
set -euo pipefail

cd /Users/taj/klarpakke

CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | sed 's/^CRON_SECRET=//' | tr -d '\n' | tr -d '"' | tr -d "'")

if [ -z "$CRON_SECRET" ]; then
  echo "ERROR: Mangler CRON_SECRET i .env.local"
  exit 1
fi

echo "=== Coin Price Update $(date -u +'%Y-%m-%dT%H:%M:%SZ') ==="

RESPONSE=$(curl -s --max-time 30 --retry 2 --retry-delay 2 \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "User-Agent: hermes-cron-update-coin-prices" \
  "https://www.klarpakke.no/api/cron/sync-prices")

echo "$RESPONSE"

# Rask validering: success må være true
OK=$(echo "$RESPONSE" | python3 -c "import sys,json; print('true' if json.load(sys.stdin).get('success') else 'false')" 2>/dev/null || echo "false")
if [ "$OK" != "true" ]; then
  echo "ERROR: sync-prices rapporterte ikke success"
  exit 1
fi

echo ""
echo "=== OK ==="
