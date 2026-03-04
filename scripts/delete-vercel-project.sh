#!/bin/bash
set -e

VERCEL_TOKEN="${VERCEL_TOKEN:-}"
PROJECT_NAME="klarpakke"

if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ VERCEL_TOKEN mangler!"
  echo "Lag token her: https://vercel.com/account/tokens"
  echo "Deretter: export VERCEL_TOKEN='din-token'"
  exit 1
fi

echo "🔍 Finner Vercel prosjekt ID for $PROJECT_NAME..."
PROJECT_ID=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_NAME" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | jq -r '.id')

if [ "$PROJECT_ID" == "null" ]; then
  echo "✅ Prosjekt finnes ikke allerede (eller token mangler tilgang)"
  exit 0
fi

echo "🗑️  Sletter Vercel prosjekt $PROJECT_ID..."
curl -X DELETE "https://api.vercel.com/v9/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN"

echo ""
echo "✅ Vercel-prosjekt slettet!"
echo "   Cloudflare Pages er nå eneste deployment."
