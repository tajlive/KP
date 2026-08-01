#!/bin/bash
# PilotTrade ping — trigger én trade per auto-trading bruker via cron-secret
# Kjører uten LLM. Kall: bash scripts/pilot-engine-ping.sh

CRON_SECRET="smart-trader-v3-cron-2026-1785191554"
URL="https://www.klarpakke.no/api/pilot-engine"
CALLS=12   # antall brukere å handle for (11 auto-brukere + margin)

for i in $(seq 1 $CALLS); do
  RESP=$(curl -s -X POST "$URL" \
    -H "x-cron-secret: $CRON_SECRET" \
    -H "Content-Type: application/json" \
    --connect-timeout 10 --max-time 30)
  
  SUCCESS=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('trade',{}).get('success',False))" 2>/dev/null)
  
  if [ "$SUCCESS" = "True" ]; then
    TRADE_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('trade',{}).get('tradeId','')[:12])" 2>/dev/null)
    echo "✅ Trade $i: $TRADE_ID..."
  else
    MSG=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','')[:60])" 2>/dev/null)
    echo "⏭️  Trade $i: $MSG"
  fi
  
  sleep 2  # rate-limit: 2s mellom hver
done

echo "🎭 PilotTrade ping ferdig: $CALLS forsøk"
