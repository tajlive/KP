#!/bin/bash

BASE_URL="https://www.klarpakke.no"
ENDPOINTS=(
  "/"
  "/no"
  "/no/dashboard"
  "/no/paper-trading"
  "/no/kurs"
  "/no/kontakt"
  "/en"
  "/api/health"
)

echo "🧪 Testing Klarpakke endpoints..."
echo "================================"

for endpoint in "${ENDPOINTS[@]}"; do
  URL="${BASE_URL}${endpoint}"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
  
  if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 302 ] || [ "$HTTP_CODE" -eq 307 ]; then
    echo "✅ $endpoint - HTTP $HTTP_CODE"
  else
    echo "❌ $endpoint - HTTP $HTTP_CODE (FAILED)"
  fi
done

echo ""
echo "🔍 Checking for Analytics script..."
curl -s "$BASE_URL" | grep -q "vercel" && echo "✅ Vercel Analytics detected" || echo "⚠️ Analytics not found"

echo ""
echo "📊 Testing complete!"
