#!/bin/bash
# AUTO-DNS Setup for www.klarpakke.no via Cloudflare API
# Kjør etter at CLOUDFLARE_API_TOKEN er lagt til i .env.local

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Last env vars
if [ -f ".env.local" ]; then
  export $(grep -E '^CLOUDFLARE_API_TOKEN=' .env.local | xargs)
fi

LOG_FILE="/tmp/klarpakke-auto-dns-$(date +%Y%m%d-%H%M%S).log"
DOMAIN="klarpakke.no"
WWW_DOMAIN="www.klarpakke.no"

# Farger
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
  echo -e "$1" | tee -a "$LOG_FILE"
}

log "═══════════════════════════════════════════════════════════"
log "🤖 AUTO-DNS: Cloudflare API Automation"
log "═══════════════════════════════════════════════════════════"
log ""

# Sjekk token
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  log "${RED}❌ CLOUDFLARE_API_TOKEN ikke funnet!${NC}"
  log ""
  log "Legg til i .env.local:"
  log "CLOUDFLARE_API_TOKEN=din_token_her"
  exit 1
fi

log "${GREEN}✅ API token funnet${NC}"
log ""

# Funksjon for API kall
cf_api() {
  local method=$1
  local endpoint=$2
  local data=$3
  
  if [ -n "$data" ]; then
    curl -s -X "$method" "https://api.cloudflare.com/client/v4$endpoint" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -X "$method" "https://api.cloudflare.com/client/v4$endpoint" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
  fi
}

# STEG 1: Hent Zone ID
log "🔍 STEG 1: Henter Zone ID for $DOMAIN..."

ZONE_RESPONSE=$(cf_api GET "/zones?name=$DOMAIN")
ZONE_ID=$(echo "$ZONE_RESPONSE" | jq -r '.result[0].id' 2>/dev/null || echo "")

if [ -z "$ZONE_ID" ] || [ "$ZONE_ID" = "null" ]; then
  log "${RED}❌ Kunne ikke finne zone for $DOMAIN${NC}"
  log "Response: $ZONE_RESPONSE"
  exit 1
fi

log "${GREEN}✅ Zone ID: $ZONE_ID${NC}"
log ""

# STEG 2: Slett gamle www-records
log "🔍 STEG 2: Sletter gamle www-records..."

RECORDS_RESPONSE=$(cf_api GET "/zones/$ZONE_ID/dns_records?name=$WWW_DOMAIN")
RECORD_IDS=$(echo "$RECORDS_RESPONSE" | jq -r '.result[].id' 2>/dev/null || echo "")

if [ -n "$RECORD_IDS" ]; then
  for record_id in $RECORD_IDS; do
    log "  🗑️  Sletter record: $record_id"
    cf_api DELETE "/zones/$ZONE_ID/dns_records/$record_id" > /dev/null
  done
  log "${GREEN}✅ Slettet $(echo "$RECORD_IDS" | wc -l | tr -d ' ') gamle record(s)${NC}"
else
  log "${YELLOW}⚠️  Ingen gamle records funnet${NC}"
fi
log ""

# STEG 3: Opprett nye A-records
log "🔍 STEG 3: Oppretter nye A-records..."

GOOGLE_IPS=(
  "216.239.32.21"
  "216.239.34.21"
  "216.239.36.21"
  "216.239.38.21"
)

for ip in "${GOOGLE_IPS[@]}"; do
  log "  ➕ Legger til A-record: $ip"
  
  CREATE_RESPONSE=$(cf_api POST "/zones/$ZONE_ID/dns_records" "{
    \"type\": \"A\",
    \"name\": \"www\",
    \"content\": \"$ip\",
    \"ttl\": 3600,
    \"proxied\": false
  }")
  
  SUCCESS=$(echo "$CREATE_RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")
  
  if [ "$SUCCESS" = "true" ]; then
    log "     ${GREEN}✅ OK${NC}"
  else
    log "     ${RED}❌ Feil: $(echo "$CREATE_RESPONSE" | jq -r '.errors[0].message' 2>/dev/null || echo "Ukjent feil")${NC}"
  fi
done

log ""
log "${GREEN}✅ Opprettet ${#GOOGLE_IPS[@]} A-records${NC}"
log ""

# STEG 4: Verifiser
log "🔍 STEG 4: Verifiserer nye records..."

sleep 2

NEW_RECORDS=$(cf_api GET "/zones/$ZONE_ID/dns_records?name=$WWW_DOMAIN&type=A")
RECORD_COUNT=$(echo "$NEW_RECORDS" | jq -r '.result | length' 2>/dev/null || echo "0")

log "  📊 Antall A-records for www: $RECORD_COUNT"
log ""

echo "$NEW_RECORDS" | jq -r '.result[] | "  • \(.content) (TTL: \(.ttl), Proxy: \(.proxied))"' | tee -a "$LOG_FILE"

log ""
log "═══════════════════════════════════════════════════════════"
log "${GREEN}✅ AUTO-DNS FULLFØRT!${NC}"
log "═══════════════════════════════════════════════════════════"
log ""
log "⏳ DNS vil propagere om 5-30 minutter"
log ""
log "Test med:"
log "  dig A $WWW_DOMAIN"
log "  curl -I https://$WWW_DOMAIN"
log ""
log "Logg: $LOG_FILE"
