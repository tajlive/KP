#!/bin/bash
# Test impact-health-ruten i prod med en autentisert bruker.
# Bruker: testbruker (ikke admin) → forventer 403, som beviser at auth-kjeden virker.
set -e

SUPABASE_URL="https://pskhryjzkobytnfwucrb.supabase.co"
ANON=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | head -1 | cut -d= -f2- | tr -d '"')
EMAIL="test+tricky+123@klarpakke.no"
PASS="TestTest123!"

echo "=== Login (testbruker) ==="
LOGIN=$(curl -s --max-time 20 -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
ACCESS=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
REFRESH=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('refresh_token',''))" 2>/dev/null)
if [ -z "$ACCESS" ]; then echo "LOGIN FIKK IKKE TOKEN — sjekk passord i references/test-users.md"; exit 1; fi
echo "Login OK"

SESSION_JSON=$(python3 -c "
import json
print(json.dumps({'access_token':'$ACCESS','refresh_token':'$REFRESH'}))
")
COOKIE="sb-pskhryjzkobytnfwucrb-auth-token=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$SESSION_JSON'''))")"

echo "=== GET /api/admin/impact-health (testbruker — forventet 403) ==="
curl -s --max-time 30 -H "Cookie: $COOKIE" "https://www.klarpakke.no/api/admin/impact-health" -w "\nHTTP:%{http_code}"
echo ""
