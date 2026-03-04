#!/bin/bash
# Sett opp Vipps Webhook via API

set -e

echo "🔗 Setter opp Vipps Webhook..."
echo ""

# Les miljøvariabler fra .env.local
export $(grep -v '^#' .env.local | grep -E 'VIPPS_' | xargs)

VIPPS_API_URL="${VIPPS_API_URL:-https://api.vipps.no}"

echo "API URL: $VIPPS_API_URL"
echo "Merchant SN: $VIPPS_MERCHANT_SERIAL_NUMBER"
echo ""

# 1. Hent access token
echo "1️⃣  Henter access token..."
TOKEN_RESPONSE=$(curl -s -X POST "$VIPPS_API_URL/accesstoken/get" \
  -H "client_id: $VIPPS_CLIENT_ID" \
  -H "client_secret: $VIPPS_CLIENT_SECRET" \
  -H "Ocp-Apim-Subscription-Key: $VIPPS_SUBSCRIPTION_KEY" \
  -H "Merchant-Serial-Number: $VIPPS_MERCHANT_SERIAL_NUMBER")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Kunne ikke hente access token"
    echo "Response: $TOKEN_RESPONSE"
    exit 1
fi

echo "   ✅ Token mottatt"
echo ""

# 2. Sjekk eksisterende webhooks
echo "2️⃣  Sjekker eksisterende webhooks..."
curl -s -X GET "$VIPPS_API_URL/webhooks/v1/webhooks" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Ocp-Apim-Subscription-Key: $VIPPS_SUBSCRIPTION_KEY" \
  -H "Merchant-Serial-Number: $VIPPS_MERCHANT_SERIAL_NUMBER" | jq .

echo ""

# 3. Registrer ny webhook
echo "3️⃣  Registrerer webhook..."
WEBHOOK_URL="https://www.klarpakke.no/api/vipps/webhook"

curl -s -X POST "$VIPPS_API_URL/webhooks/v1/webhooks" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Ocp-Apim-Subscription-Key: $VIPPS_SUBSCRIPTION_KEY" \
  -H "Merchant-Serial-Number: $VIPPS_MERCHANT_SERIAL_NUMBER" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"$WEBHOOK_URL\",
    \"events\": [
      \"epayments.payment.created.v1\",
      \"epayments.payment.aborted.v1\",
      \"epayments.payment.cancelled.v1\",
      \"epayments.payment.captured.v1\",
      \"epayments.payment.refunded.v1\",
      \"epayments.payment.terminated.v1\"
    ]
  }" | jq .

echo ""
echo "✅ Webhook registrert!"
echo ""
echo "📋 Viktig: Lagre 'secret' fra responsen over"
echo "   Denne må legges til i .env.local som VIPPS_WEBHOOK_SECRET"
