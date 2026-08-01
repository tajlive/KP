#!/usr/bin/env bash
set -euo pipefail
source /Users/taj/klarpakke/.env.local

echo "=== TRADES ETTER 2026-07-30T11:00:00Z ==="
curl -sS -X GET "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/trades?select=created_at,trading_pair,side,status,realized_pnl&created_at=gt.2026-07-30T11:00:00Z&order=created_at.desc" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" | python3 -c '
import sys, json
data = json.load(sys.stdin)
print(f"TOTAL_TRADES: {len(data)}")
if data:
    print(json.dumps(data, indent=2))
else:
    print("[]")
'
