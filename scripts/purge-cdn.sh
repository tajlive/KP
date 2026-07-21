#!/bin/bash
# CDN Cache Purge — automatisk etter deploy
# Usage: ./scripts/purge-cdn.sh
# Krever: CLOUDFLARE_API_TOKEN i env, eller wrangler token

set -e

ZONE_ID="328d7de7e8e48308fd4f9d760da5b18f"
TOKEN=""

# Try to get token from wrangler
if command -v npx &> /dev/null; then
  TOKEN=$(npx wrangler whoami 2>/dev/null | grep -o "API Token:.*" | awk '{print $3}')
fi

# Fallback to env var
if [ -z "$TOKEN" ] && [ -n "$CLOUDFLARE_API_TOKEN" ]; then
  TOKEN="$CLOUDFLARE_API_TOKEN"
fi

if [ -z "$TOKEN" ]; then
  echo "⚠️  No Cloudflare API token available — skipping CDN purge"
  echo "   Set CLOUDFLARE_API_TOKEN or run wrangler login"
  exit 0
fi

echo "🌐  Purger CDN cache..."
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything":true}')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅  CDN purged successfully"
else
  echo "⚠️  CDN purge returned HTTP $HTTP_CODE — cache may be stale"
fi
