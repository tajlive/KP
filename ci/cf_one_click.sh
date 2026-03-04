#!/usr/bin/env bash
set -euo pipefail

if [ -z "${CF_API_TOKEN:-}" ]; then
  echo "ERROR: CF_API_TOKEN is not set"
  exit 1
fi

echo "Verifying Cloudflare token..."
curl -s -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" | jq .

if [ -z "${CF_ZONE_ID:-}" ]; then
  echo "Fetching ZONE_ID for klarpakke.no..."
  CF_ZONE_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=klarpakke.no" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" | jq -r '.result[0].id // empty')
fi

if [ -z "${CF_ZONE_ID:-}" ] || [ "${CF_ZONE_ID}" = "null" ]; then
  echo "ERROR: CF_ZONE_ID not found. Set CF_ZONE_ID or ensure token has Zone:Read"
  exit 1
fi

MY_IP=$(curl -s https://ifconfig.me || curl -s https://ipinfo.io/ip || true)

if [ -n "${MY_IP:-}" ]; then
  echo "Creating temporary firewall rule to allow ${MY_IP}..."
  CREATE_RESP=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/firewall/rules" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "[
      {
        \"action\":\"allow\",
        \"filter\":{\"expression\":\"ip.src eq ${MY_IP}\",\"paused\":false},
        \"description\":\"Temporary allow for debugging from CI\"
      }
    ]")
  echo "$CREATE_RESP" | jq .
  RULE_ID=$(echo "$CREATE_RESP" | jq -r '.result[0].id // empty')
fi

echo "Purging Cloudflare cache..."
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}' | jq .

sleep 5

if [ -n "${RULE_ID:-}" ]; then
  echo "Deleting temporary firewall rule ${RULE_ID}..."
  curl -s -X DELETE "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/firewall/rules/${RULE_ID}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" | jq .
fi

echo "Done"
