#!/bin/bash
# Pre-deploy Cloudflare secrets check
# Verifiserer at alle nodvendige secrets er satt for Cloudflare Workers
# Bruk: bash scripts/pre-deploy-check-secrets.sh
# Kalles automagisk for wrangler deploy

set -euo pipefail

REQUIRED_SECRETS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "DATABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  "CRON_SECRET"
  "NEXT_PUBLIC_SENTRY_DSN"
  "BINANCE_PROXY_SECRET"
  "VIPPS_CLIENT_ID"
  "VIPPS_CLIENT_SECRET"
  "VIPPS_MERCHANT_SERIAL"
  "VIPPS_SUBSCRIPTION_KEY"
)

echo "🔍 Sjekker Cloudflare secrets..."
echo ""

CF_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
if [ -z "$CF_TOKEN" ]; then
  if [ -f .env.local ]; then
    CF_TOKEN=$(grep "^CLOUDFLARE_API_TOKEN=" .env.local | head -1 | cut -d= -f2)
  fi
fi

if [ -z "$CF_TOKEN" ]; then
  echo "❌ CLOUDFLARE_API_TOKEN ikke funnet. Sett i .env.local eller eksporter."
  exit 1
fi

ACCOUNT_ID="80d5b1d56a3e907150ba7348b6182894"
SCRIPT_NAME="klarpakke"

RESULT=$(curl -s "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT_NAME}/secrets" \
  -H "Authorization: Bearer ${CF_TOKEN}" 2>/dev/null)

if ! echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); exit(0 if d['success'] else 1)" 2>/dev/null; then
  echo "❌ Kunne ikke hente secrets fra Cloudflare API"
  exit 1
fi

EXISTING_SECRETS=$(echo "$RESULT" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for s in d['result']:
    print(s['name'])
" 2>/dev/null)

MISSING=0
for secret in "${REQUIRED_SECRETS[@]}"; do
  if echo "$EXISTING_SECRETS" | grep -q "^${secret}$"; then
    echo "  ✅ $secret"
  else
    echo "  ❌ $secret — MANGLER!"
    MISSING=$((MISSING + 1))
  fi
done

echo ""
if [ $MISSING -eq 0 ]; then
  echo "✅ Alle ${#REQUIRED_SECRETS[@]} secrets er satt. Klar for deploy!"
  exit 0
else
  echo "❌ $MISSING secrets mangler. Fiks for deploy."
  exit 1
fi
