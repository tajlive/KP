#!/bin/bash

BASE_URL="https://www.klarpakke.no"
ENDPOINTS=(
  "/:ROOT"
  "/no:NO-HOME"
  "/no/dashboard:DASHBOARD"
  "/no/paper-trading:PAPER-TRADING"
  "/no/kurs:KURS"
  "/no/kontakt:KONTAKT"
  "/no/admin:ADMIN"
  "/en:ENGLISH"
  "/th:THAI"
  "/zh:CHINESE"
  "/api/health:HEALTH"
)

PASSED=0
FAILED=0

echo "🧪 FULL NETTSIDE HEALTH CHECK"
echo "================================"
echo "Dato: $(date)"
echo ""

for item in "${ENDPOINTS[@]}"; do
  ENDPOINT="${item%%:*}"
  NAME="${item##*:}"
  URL="${BASE_URL}${ENDPOINT}"
  
  # Følg redirects og få final HTTP code
  HTTP_CODE=$(curl -s -L -o /dev/null -w "%{http_code}" "$URL")
  
  if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ $NAME ($ENDPOINT) - HTTP $HTTP_CODE"
    ((PASSED++))
  elif [ "$HTTP_CODE" -eq 307 ] || [ "$HTTP_CODE" -eq 302 ]; then
    echo "✅ $NAME ($ENDPOINT) - HTTP $HTTP_CODE (redirect)"
    ((PASSED++))
  elif [ "$HTTP_CODE" -eq 401 ] || [ "$HTTP_CODE" -eq 403 ]; then
    echo "⚠️  $NAME ($ENDPOINT) - HTTP $HTTP_CODE (auth required - OK)"
    ((PASSED++))
  else
    echo "❌ $NAME ($ENDPOINT) - HTTP $HTTP_CODE (FAILED)"
    ((FAILED++))
  fi
done

echo ""
echo "================================"
echo "Resultat: $PASSED/$((PASSED+FAILED)) passed"
echo ""

# Sjekk for analytics script
echo "🔍 Sjekker Analytics script..."
HTML=$(curl -s "$BASE_URL")
echo "$HTML" | grep -q "vercel/analytics" && echo "✅ Vercel Analytics script funnet" || echo "⚠️  Vercel Analytics ikke funnet (forventet - site kjører på Cloud Run)"
echo "$HTML" | grep -q "_vercel" && echo "✅ Vercel inject script funnet" || echo "⚠️  Vercel inject ikke funnet"

echo ""
echo "🔍 Sjekker response headers..."
curl -sI "$BASE_URL" | grep -E "server|x-vercel|cloud-trace" || true

echo ""
echo "📊 Testing complete!"
