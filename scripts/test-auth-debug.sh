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
EXPIRES_IN=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['expires_in'])")
USER_ID=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['user']['id'])")

# Bygg session-payload EKSAKT som Supabase SSR forventer
# Format: base64url(JSON.stringify(session))
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

# Base64url encode (uten padding)
SESSION_B64=$(python3 -c "
import base64
json_str = '''$SESSION_JSON'''
b64 = base64.urlsafe_b64encode(json_str.encode()).decode().rstrip('=')
print(b64)
")

REF="pskhryjzkobytnfwucrb"
AUTH_COOKIE="sb-${REF}-auth-token"
REFRESH_COOKIE="sb-${REF}-refresh-token"

echo "Session JSON: ${SESSION_JSON:0:80}..."
echo "Base64: ${SESSION_B64:0:50}..."
echo ""

# Test 1: Standard Supabase SSR cookie-format
echo "=== TEST 1: sb-auth-token=base64(session) ==="
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Cookie: $AUTH_COOKIE=$SESSION_B64; $REFRESH_COOKIE=$REFRESH" \
  "https://www.klarpakke.no/no/dashboard"

# Test 2: Raw JSON (noen SSR-versjoner bruker dette)
echo "=== TEST 2: sb-auth-token=raw JSON ==="
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Cookie: $AUTH_COOKIE=$SESSION_JSON; $REFRESH_COOKIE=$REFRESH" \
  "https://www.klarpakke.no/no/dashboard"

# Test 3: Bare access_token (enkelt format)
echo "=== TEST 3: sb-auth-token=access_token ==="
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Cookie: $AUTH_COOKIE=$ACCESS; $REFRESH_COOKIE=$REFRESH" \
  "https://www.klarpakke.no/no/dashboard"

# Test 4: Med domain=.klarpakke.no
echo "=== TEST 4: Med domain ==="
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Cookie: $AUTH_COOKIE=$SESSION_B64; Domain=.klarpakke.no; Path=/; $REFRESH_COOKIE=$REFRESH; Domain=.klarpakke.no; Path=/" \
  "https://www.klarpakke.no/no/dashboard"

echo ""
echo "=== DEBUG: Hva skjer i middleware? ==="
curl -s -D - -o /dev/null \
  -H "Cookie: $AUTH_COOKIE=$SESSION_B64; $REFRESH_COOKIE=$REFRESH" \
  "https://www.klarpakke.no/no/dashboard" | grep -E "(HTTP|Location|Set-Cookie)" | head -10
