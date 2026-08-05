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

echo "=== ALLE SIDER MED RIKTIG AUTH ==="
PATHS=(
  "/no/dashboard"
  "/no/dashboard/portfolio"
  "/no/dashboard/historikk"
  "/no/dashboard/resultater"
  "/no/dashboard/analysis"
  "/no/dashboard/settings"
  "/no/dashboard/referral"
  "/no/handel"
  "/no/marked"
  "/no/profile"
  "/no/vanlige-sporsmal"
  "/no/leaderboard"
  "/no/copy-trading"
  "/no/kurs"
  "/no/akademi"
  "/no/priser"
  "/no/hjelp"
  "/no/om-oss"
  "/no/kontakt"
  "/no/api-dokumentasjon"
  "/no/binance-guide"
  "/no/kalkulator"
)

for path in "${PATHS[@]}"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Cookie: $AUTH_COOKIE=$SESSION_JSON; $REFRESH_COOKIE=$REFRESH" \
    "https://www.klarpakke.no$path")
  echo "$CODE $path"
done

echo ""
echo "=== API-ENDEPUNKTER ==="
APIS=(
  "/api/portfolio/summary"
  "/api/trading/sessions"
  "/api/user/trades"
  "/api/user/balance"
  "/api/leaderboard"
)

for api in "${APIS[@]}"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Cookie: $AUTH_COOKIE=$SESSION_JSON; $REFRESH_COOKIE=$REFRESH" \
    "https://www.klarpakke.no$api")
  echo "$CODE $api"
done

echo ""
echo "=== INNHOLDS-SJEKK ==="
for path in "/no/dashboard" "/no/handel" "/no/profile" "/no/copy-trading"; do
  echo "--- $path ---"
  curl -s \
    -H "Cookie: $AUTH_COOKIE=$SESSION_JSON; $REFRESH_COOKIE=$REFRESH" \
    "https://www.klarpakke.no$path" | grep -o "<title>[^<]*</title>" | head -1
done
