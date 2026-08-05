#!/bin/bash
cd /Users/taj/klarpakke

SUPABASE_URL="https://pskhryjzkobytnfwucrb.supabase.co"
ANON=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2)
TOKEN=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -d '{"email":"test+tricky+123@klarpakke.no","password":"TestTest123!"}' | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

echo "=== REDIRECT-ANALYSE ==="
for path in "/no/dashboard" "/no/handel" "/no/profile" "/no/copy-trading" "/no/akademi"; do
  echo -n "$path -> "
  curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}" -H "Authorization: Bearer $TOKEN" "https://www.klarpakke.no$path"
  echo ""
done

echo ""
echo "=== COOKIE-BASERT TEST (simulerer browser) ==="
for path in "/no/dashboard" "/no/handel" "/no/profile"; do
  echo -n "$path: "
  curl -s -o /dev/null -w "%{http_code}" \
    -H "Cookie: sb-access-token=$TOKEN; sb-refresh-token=test" \
    "https://www.klarpakke.no$path"
  echo ""
done

echo ""
echo "=== INNHOLDS-SJEKK (utloggede sider som fungerer) ==="
for path in "/no/marked" "/no/vanlige-sporsmal" "/no/leaderboard" "/no/priser" "/no/hjelp"; do
  echo "--- $path ---"
  curl -s "https://www.klarpakke.no$path" | grep -o "<title>[^<]*</title>" | head -1
done
