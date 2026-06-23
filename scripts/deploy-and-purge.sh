#!/bin/bash
# ⚠️  DEPRECATED / LEGACY
# This script deploys to Cloudflare Pages and is NOT the current production deploy path.
# Current source of truth:
#   - CI/CD: .woodpecker/deploy.yml
#   - Manual deploy: npm run cf:deploy
# Kept for historical/reference purposes only.
set -e

echo "🚀 Deploying to Cloudflare Pages..."

# Build
rm -rf .open-next
npx opennextjs-cloudflare build

# Deploy
npx wrangler pages deploy .open-next --project-name=klarpakke --branch=main --commit-dirty=true

echo "⏳ Waiting 10 seconds for deployment to propagate..."
sleep 10

# Purge cache
ZONE_ID=$(curl -X GET \
  "https://api.cloudflare.com/client/v4/zones?name=klarpakke.no" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  --silent | jq -r '.result[0].id')

echo "🧹 Purging Cloudflare cache..."
curl -X POST \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}' \
  --silent | jq '.success'

echo "✅ Deployment complete! Cache purged!"
echo "🌍 Visit https://www.klarpakke.no"
