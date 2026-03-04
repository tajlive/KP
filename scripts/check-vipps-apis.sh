#!/bin/bash
# Sjekk hvilke Vipps API-er som er tilgjengelige

export $(grep -v '^#' .env.local | grep -E 'VIPPS_' | xargs)

echo "🔍 Sjekker Vipps API-er..."
echo ""

# Hent token
TOKEN=$(curl -s -X POST https://api.vipps.no/accesstoken/get \
  -H "client_id: $VIPPS_CLIENT_ID" \
  -H "client_secret: $VIPPS_CLIENT_SECRET" \
  -H "Ocp-Apim-Subscription-Key: $VIPPS_SUBSCRIPTION_KEY" | jq -r '.access_token')

echo "1️⃣  Sjekker eCom API (gammel)..."
curl -s -X GET "https://api.vipps.no/ecomm/v2/payments/test/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Ocp-Apim-Subscription-Key: $VIPPS_SUBSCRIPTION_KEY" \
  -H "Merchant-Serial-Number: $VIPPS_MERCHANT_SERIAL_NUMBER" | head -5

echo ""
echo "2️⃣  Sjekker ePayment API (ny)..."
curl -s -X GET "https://api.vipps.no/epayment/v1/payments/test" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Ocp-Apim-Subscription-Key: $VIPPS_SUBSCRIPTION_KEY" \
  -H "Merchant-Serial-Number: $VIPPS_MERCHANT_SERIAL_NUMBER" | head -5

echo ""
echo "3️⃣  Sjekker Checkout API..."
curl -s -X GET "https://api.vipps.no/checkout/v3/session/test" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Ocp-Apim-Subscription-Key: $VIPPS_SUBSCRIPTION_KEY" \
  -H "Merchant-Serial-Number: $VIPPS_MERCHANT_SERIAL_NUMBER" | head -5
