#!/bin/bash
cd /Users/taj/klarpakke

SUPABASE_URL="https://pskhryjzkobytnfwucrb.supabase.co"
ANON=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2)

RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -d '{"email":"test+tricky+123@klarpakke.no","password":"TestTest123!"}')

ACCESS=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")
REFRESH=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['refresh_token'])")
EXPIRES_IN=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['expires_in'])")
USER_ID=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['user']['id'])")

SESSION_JSON=$(python3 -c "
import json, time
session = {
    'access_token': '$ACCESS',
    'refresh_token': '$REFRESH',
    'expires_in': $EXPIRES_IN,
    'expires_at': int(time.time()) + $EXPIRES_IN,
    'token_type': 'bearer',
    'user': {'id': '$USER_ID'}
}
print(json.dumps(session, separators=(',', ':')))
")

REF="pskhryjzkobytnfwucrb"
AUTH_COOKIE="sb-${REF}-auth-token"
REFRESH_COOKIE="sb-${REF}-refresh-token"

echo "=== /no/handel REDIRECT ==="
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" \
  -H "Cookie: $AUTH_COOKIE=$SESSION_JSON; $REFRESH_COOKIE=$REFRESH" \
  "https://www.klarpakke.no/no/handel"

echo ""
echo "=== /no/trade (redirect-mål) ==="
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Cookie: $AUTH_COOKIE=$SESSION_JSON; $REFRESH_COOKIE=$REFRESH" \
  "https://www.klarpakke.no/no/trade"

echo ""
echo "=== /no/trade INNHOLD ==="
curl -s \
  -H "Cookie: $AUTH_COOKIE=$SESSION_JSON; $REFRESH_COOKIE=$REFRESH" \
  "https://www.klarpakke.no/no/trade" | grep -o "<title>[^<]*</title>" | head -1

echo ""
echo "=== KNAPPER PÅ DASHBOARD ==="
curl -s \
  -H "Cookie: $AUTH_COOKIE=$SESSION_JSON; $REFRESH_COOKIE=$REFRESH" \
  "https://www.klarpakke.no/no/dashboard" | grep -o 'href="[^"]*"' | sort | uniq -c | sort -rn | head -20

echo ""
echo "=== KNAPPER PÅ HANDEL ==="
curl -s \
  -H "Cookie: $AUTH_COOKIE=$SESSION_JSON; $REFRESH_COOKIE=$REFRESH" \
  "https://www.klarpakke.no/no/trade" | grep -o 'href="[^"]*"' | sort | uniq -c | sort -rn | head -20
