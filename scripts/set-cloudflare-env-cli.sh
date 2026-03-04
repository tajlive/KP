#!/bin/bash
set -e

if [ ! -f .env.local ]; then
  echo "❌ .env.local ikke funnet!"
  exit 1
fi

source .env.local

ACCOUNT_ID="80d5b1d56a3e907150ba7348b6182894"
PROJECT_NAME="klarpakke"

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "❌ CLOUDFLARE_API_TOKEN må være satt!"
  echo "Kjør: export CLOUDFLARE_API_TOKEN='<din-token>'"
  exit 1
fi

echo "🔐 Setter Cloudflare Pages environment variables..."

# Funksjon for å sette env var via API
set_env_var() {
  local key=$1
  local value=$2
  local type=${3:-"plain_text"}
  
  echo "  Setting $key..."
  
  curl -X PATCH \
    "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{
      \"deployment_configs\": {
        \"production\": {
          \"env_vars\": {
            \"$key\": {
              \"type\": \"$type\",
              \"value\": \"$value\"
            }
          }
        }
      }
    }" \
    --silent | jq -r '.success'
}

set_env_var "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL" "plain_text"
set_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY" "plain_text"
set_env_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "plain_text"
set_env_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY" "secret_text"

echo "✅ Environment variables satt!"
