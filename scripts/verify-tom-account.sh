#!/bin/bash
# Innlogging + verifisering av tomarnejensen@gmail.com mot prod (begge flater)
set -e
cd /Users/taj/klarpakke

URL=$(grep "^SUPABASE_URL=" .env.local | cut -d= -f2 | tr -d '"' | tr -d "'")
ANON=$(grep "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local | cut -d= -f2 | tr -d '"' | tr -d "'")
REF="pskhryjzkobytnfwucrb"

echo "=== 1. INNLOGGING ==="
RESP=$(curl -s -m 20 -X POST -H "Content-Type: application/json" -H "apikey: $ANON" \
  -d '{"email":"tomarnejensen@gmail.com","password":"TestTest123!"}' \
  "$URL/auth/v1/token?grant_type=password")

USER_ID=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('user',{}).get('id',''))" 2>/dev/null)
EMAIL=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('user',{}).get('email',''))" 2>/dev/null)
AT=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null)

if [ -z "$USER_ID" ] || [ "$USER_ID" != "0dd08529-b8a8-4fd3-9806-275e2d0135dd" ]; then
  echo "FEIL: innlogging ga ikke riktig bruker. Fikk: $EMAIL / $USER_ID"
  exit 1
fi
echo "OK: $EMAIL ($USER_ID)"
echo "$RESP" > /tmp/kp-session.json

# Bygg SSR-cookie (RAW JSON — ikke base64) + Bearer
COOKIE_VALUE=$(echo "$RESP" | python3 -c "
import json,sys
d=json.load(sys.stdin)
session={'access_token':d['access_token'],'refresh_token':d['refresh_token'],'expires_in':d.get('expires_in',3600),'expires_at':d.get('expires_at'),'token_type':'bearer','user':d['user']}
import json as j
print(j.dumps(session))
")
echo "COOKIE_VALUE=$COOKIE_VALUE" > /tmp/kp-cookie.txt

echo ""
echo "=== 2. LEKEPENGER (paper) ==="
echo "--- /api/paper-trading/balance ---"
curl -s -m 20 -H "Cookie: sb-$REF-auth-token=$COOKIE_VALUE" \
  "https://www.klarpakke.no/api/paper-trading/balance" | python3 -m json.tool 2>/dev/null | head -30

echo ""
echo "--- /api/user/trades?limit=3 ---"
curl -s -m 20 -H "Cookie: sb-$REF-auth-token=$COOKIE_VALUE" \
  "https://www.klarpakke.no/api/user/trades?limit=3" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('ok:', d.get('ok'), '| trades:', len(d.get('trades',[])), '| positions:', len(d.get('positions',[])))
for t in d.get('trades',[])[:3]:
    print(' ', t.get('trading_pair'), t.get('side'), 'status='+str(t.get('status')), 'mode='+str(t.get('mode')))
" 2>/dev/null

echo ""
echo "=== 3. EKTE PENGER (live) ==="
echo "--- /api/kraken/live-state ---"
curl -s -m 20 -H "Cookie: sb-$REF-auth-token=$COOKIE_VALUE" \
  "https://www.klarpakke.no/api/kraken/live-state" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('connected:', d.get('connected'))
if d.get('connected'):
    print('total_usdc:', d.get('total_usdc'), '| ordrer:', d.get('open_orders'), '| profit:', d.get('realized_profit_usdc'))
" 2>/dev/null

echo ""
echo "--- /api/ai/autopilot/status ---"
curl -s -m 20 -H "Cookie: sb-$REF-auth-token=$COOKIE_VALUE" \
  "https://www.klarpakke.no/api/ai/autopilot/status" | head -c 300

echo ""
echo ""
echo "=== 4. DASHBOARD METRICS ==="
curl -s -m 20 -H "Cookie: sb-$REF-auth-token=$COOKIE_VALUE" \
  "https://www.klarpakke.no/api/dashboard/metrics?mode=paper" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if 'metrics' in d: d=d['metrics']
print('totalPnl:', d.get('totalPnl'), '| totalTrades:', d.get('totalTrades'), '| totalCapital:', d.get('totalCapital'), '| accountBalance:', d.get('accountBalance'), '| winRate:', d.get('winRate'))
" 2>/dev/null || curl -s -m 20 -H "Cookie: sb-$REF-auth-token=$COOKIE_VALUE" "https://www.klarpakke.no/api/dashboard/metrics?mode=paper" | head -c 300

echo ""
echo "=== 5. RESULTATER (trading-analytics) ==="
curl -s -m 25 -H "Cookie: sb-$REF-auth-token=$COOKIE_VALUE" \
  "https://www.klarpakke.no/api/user/trading-analytics" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if d.get('ok'):
    a=d['aggregates']
    print('tradeCount:', d.get('tradeCount'), '| totalRealizedPnl:', a.get('totalRealizedPnl'), '| winRate:', a.get('winRateRealizedPct'))
    print('modeSplit:', [(m['mode'], m['trades'], m['pnl']) for m in d.get('modeSplit',[])])
else:
    print('FEIL:', json.dumps(d)[:300])
" 2>/dev/null
