#!/bin/bash
# Test Vipps betaling

echo "🧪 TESTER VIPPS BETALING"
echo "========================"
echo ""

# Les miljøvariabler
export $(grep -v '^#' .env.local | grep -E 'VIPPS_' | xargs)

echo "1️⃣  Henter access token..."
TOKEN_RES=$(curl -s -X POST https://api.vipps.no/accesstoken/get \
  -H "client_id: $VIPPS_CLIENT_ID" \
  -H "client_secret: $VIPPS_CLIENT_SECRET" \
  -H "Ocp-Apim-Subscription-Key: $VIPPS_SUBSCRIPTION_KEY")

TOKEN=$(echo $TOKEN_RES | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Kunne ikke hente token"
    echo "Respons: $TOKEN_RES"
    exit 1
fi

echo "   ✅ Token mottatt"
echo ""

# Lag en test betaling
REFERENCE="TEST-$(date +%s)"
AMOUNT=2000  # 20 kr i øre

echo "2️⃣  Oppretter test betaling..."
echo "   Beløp: 20 kr"
echo "   Referanse: $REFERENCE"
echo ""

PAYMENT_RES=$(curl -s -X POST https://api.vipps.no/epayment/v1/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Ocp-Apim-Subscription-Key: $VIPPS_SUBSCRIPTION_KEY" \
  -H "Merchant-Serial-Number: $VIPPS_MERCHANT_SERIAL_NUMBER" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $REFERENCE" \
  -d "{
    \"amount\": {
      \"currency\": \"NOK\",
      \"value\": $AMOUNT
    },
    \"paymentMethod\": {
      \"type\": \"WALLET\"
    },
    \"reference\": \"$REFERENCE\",
    \"returnUrl\": \"https://www.klarpakke.no/vipps/success\",
    \"userFlow\": \"WEB_REDIRECT\",
    \"paymentDescription\": \"Test betaling Klarpakke\"
  }")

echo "Respons:"
echo "$PAYMENT_RES" | jq .

# Sjekk om vi fikk redirectUrl
REDIRECT_URL=$(echo "$PAYMENT_RES" | jq -r '.redirectUrl')

if [ -n "$REDIRECT_URL" ] && [ "$REDIRECT_URL" != "null" ]; then
    echo ""
    echo "✅ Betaling opprettet!"
    echo ""
    echo "🔗 Test URL:"
    echo "$REDIRECT_URL"
    echo ""
    echo "Åpner i nettleser..."
    open "$REDIRECT_URL" 2>/dev/null || xdg-open "$REDIRECT_URL" 2>/dev/null || echo "Kopier URL og åpne manuelt"
else
    echo ""
    echo "❌ Feil ved opprettelse av betaling"
fi
