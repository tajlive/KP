#!/usr/bin/env bash
set -euo pipefail
source /Users/taj/klarpakke/.env.local

echo "=== AKTIVE PAPER-SESSIONS ==="
curl -sS -X GET "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/trading_sessions?select=id,user_id,mode,status,created_at,last_heartbeat&mode=eq.paper&status=eq.active&order=last_heartbeat.desc" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" | python3 -c '
import sys, json
data = json.load(sys.stdin)
print(f"ACTIVE_PAPER_SESSIONS: {len(data)}")
if data:
    print(json.dumps(data[:50], indent=2))
else:
    print("[]")
'

echo ""
echo "=== NYE SESSIONS SISTE 24T ==="
curl -sS -X GET "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/trading_sessions?select=id,user_id,mode,status,created_at,last_heartbeat&created_at=gt.$(date -u -d '24 hours ago' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v-24H '+%Y-%m-%dT%H:%M:%SZ')&order=created_at.desc" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" | python3 -c '
import sys, json
data = json.load(sys.stdin)
print(f"NEW_SESSIONS_24H: {len(data)}")
if data:
    print(json.dumps(data[:50], indent=2))
else:
    print("[]")
'
