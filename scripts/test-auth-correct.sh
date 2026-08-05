#!/bin/bash
cd /Users/taj/klarpakke

SUPABASE_URL="https://pskhryjzkobytnfwucrb.supabase.co"
ANON=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2)

# Hent session
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -d '{"email":"test+tricky+123@klarpakke.no","password":"TestTest123!"}')

ACCESS=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")
REFRESH=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['refresh_token'])")
EXPIRES=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['expires_in'])")

# Bygg session-payload (slik Supabase SSR lagrer det)
SESSION=$(python3 -c "
import json, base64
session = {
    'access_token': '$ACCESS',
    'refresh_token': '$REFRESH',
    'expires_in': $EXPIRES,
    'expires_at': $(date +%s) + $EXPIRES,
    'token_type': 'bearer',
    'user': {'id': 'test'}
}
# Supabase SSR bruker base64url uten padding
json_str = json.dumps(session, separators=(',', ':'))
b64 = base64.urlsafe_b64encode(json_str.encode()).decode().rstrip('=')
print(b64)
")

REF="pskhryjzkobytnfwucrb"
AUTH_COOKIE="sb-${REF}-auth-token"
REFRESH_COOKIE="sb-${REF}-refresh-token"

echo "=== TEST MED RIKTIG COOKIE-FORMAT ==="
for path in "/no/dashboard" "/no/handel" "/no/profile" "/no/copy-trading"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Cookie: $AUTH_COOKIE=$SESSION; $REFRESH_COOKIE=$REFRESH" \
    "https://www.klarpakke.no$path")
  echo "$CODE $path"
done

echo ""
echo "=== REDIRECT-SJEKK ==="
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" \
  -H "Cookie: $AUTH_COOKIE=$SESSION; $REFRESH_COOKIE=$REFRESH" \
  "https://www.klarpakke.no/no/dashboard"
