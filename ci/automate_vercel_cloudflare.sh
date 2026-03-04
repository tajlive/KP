#!/usr/bin/env bash
set -euo pipefail

CF_API_TOKEN="${CF_API_TOKEN:?set CF_API_TOKEN in CI}"
CF_ZONE_ID="${CF_ZONE_ID:?set CF_ZONE_ID in CI}"
VERCEL_TOKEN="${VERCEL_TOKEN:?set VERCEL_TOKEN in CI}"
VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:?set VERCEL_PROJECT_ID in CI}"
DEPLOYMENT_URL="${DEPLOYMENT_URL:-}"
MY_IP="${MY_IP:-}"

CF_API_BASE="https://api.cloudflare.com/client/v4"
VERCEL_CLI="vercel --token ${VERCEL_TOKEN}"

log(){ echo "[ci] $*"; }

ensure_dns_record(){
  local type="$1" name="$2" content="$3" proxied="$4"
  local existing
  existing=$(curl -s -X GET "${CF_API_BASE}/zones/${CF_ZONE_ID}/dns_records?type=${type}&name=${name}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json" | jq -r '.result[0].id // empty')
  if [ -n "$existing" ]; then
    log "Updating DNS ${name} -> ${content}"
    curl -s -X PUT "${CF_API_BASE}/zones/${CF_ZONE_ID}/dns_records/${existing}" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json" \
      --data "{\"type\":\"${type}\",\"name\":\"${name}\",\"content\":\"${content}\",\"ttl\":1,\"proxied\":${proxied}}" | jq -r '.success'
  else
    log "Creating DNS ${name} -> ${content}"
    curl -s -X POST "${CF_API_BASE}/zones/${CF_ZONE_ID}/dns_records" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json" \
      --data "{\"type\":\"${type}\",\"name\":\"${name}\",\"content\":\"${content}\",\"ttl\":1,\"proxied\":${proxied}}" | jq -r '.success'
  fi
}

log "Set Cloudflare DNS to Vercel recommended values (DNS only)"
ensure_dns_record "A" "klarpakke.no" "216.198.79.1" false
ensure_dns_record "CNAME" "www" "a9c05bc93bdbef6b.vercel-dns-017.com" false

log "Add domains to Vercel project (idempotent)"
vercel --token "${VERCEL_TOKEN}" domains add klarpakke.no --project "${VERCEL_PROJECT_ID}" || true
vercel --token "${VERCEL_TOKEN}" domains add www.klarpakke.no --project "${VERCEL_PROJECT_ID}" || true

if [ -n "${DEPLOYMENT_URL}" ]; then
  log "Alias deployment ${DEPLOYMENT_URL} to domains"
  vercel --token "${VERCEL_TOKEN}" alias set "${DEPLOYMENT_URL}" www.klarpakke.no
  vercel --token "${VERCEL_TOKEN}" alias set "${DEPLOYMENT_URL}" klarpakke.no
else
  log "No DEPLOYMENT_URL provided; ensure Vercel Git integration or set DEPLOYMENT_URL"
fi

TEMP_RULE_ID=""
if [ -n "${MY_IP}" ]; then
  log "Creating temporary Allow rule for ${MY_IP}"
  resp=$(curl -s -X POST "${CF_API_BASE}/zones/${CF_ZONE_ID}/firewall/rules" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json" \
    --data "[{\"action\":\"allow\",\"filter\":{\"expression\":\"ip.src eq ${MY_IP}\",\"paused\":false},\"description\":\"CI temporary allow\"}]")
  TEMP_RULE_ID=$(echo "$resp" | jq -r '.result[0].id // empty')
  log "Temporary rule id ${TEMP_RULE_ID}"
fi

log "Polling Vercel for certificate issuance"
attempt=0; max=18; sleep_interval=10
while [ $attempt -lt $max ]; do
  attempt=$((attempt+1))
  status=$(vercel --token "${VERCEL_TOKEN}" domains inspect www.klarpakke.no --json 2>/dev/null | jq -r '.certificate.status // empty' || echo "")
  log "Attempt ${attempt} status: ${status:-unknown}"
  if [[ "$status" == "issued" || "$status" == "ready" ]]; then
    log "Certificate issued"
    break
  fi
  sleep $sleep_interval
done

if [ $attempt -ge $max ]; then
  log "Certificate not issued within timeout; verify manually"
fi

log "Purging Cloudflare cache"
curl -s -X POST "${CF_API_BASE}/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json" \
  --data '{"purge_everything":true}' | jq -r '.success'

if [ -n "${TEMP_RULE_ID}" ]; then
  log "Deleting temporary firewall rule ${TEMP_RULE_ID}"
  curl -s -X DELETE "${CF_API_BASE}/zones/${CF_ZONE_ID}/firewall/rules/${TEMP_RULE_ID}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json" | jq -r '.success'
fi

log "Done. Verify: curl -I https://www.klarpakke.no"
