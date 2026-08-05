#!/bin/bash
cd /Users/taj/klarpakke

SUPABASE_URL="https://pskhryjzkobytnfwucrb.supabase.co"
ANON=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2)
TOKEN=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -d '{"email":"test+tricky+123@klarpakke.no","password":"TestTest123!"}' | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

echo "TOKEN hentet: ${TOKEN:0:20}..."
echo ""
echo "=== ALLE SIDER MED AUTH ==="

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
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "https://www.klarpakke.no$path")
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
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "https://www.klarpakke.no$api")
  echo "$CODE $api"
done
