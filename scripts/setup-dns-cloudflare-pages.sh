#!/bin/bash
# ============================================================================
# SETUP DNS for Cloudflare Pages — www.klarpakke.no + klarpakke.no (apex)
#
# Hva scriptet gjør:
#   1. Henter Zone ID fra Cloudflare API
#   2. Sletter gamle Vercel-pekende records (A + CNAME for www + apex)
#   3. Oppretter CNAME www → klarpakke.pages.dev (proxied)
#   4. Oppretter CNAME @ (apex) → klarpakke.pages.dev (proxied, flattened)
#   5. Verifiserer med dig/curl
#
# Forutsetninger:
#   - Domenet bruker Cloudflare DNS (ns: haley.ns.cloudflare.com, zac.ns.cloudflare.com)
#   - CLOUDFLARE_API_TOKEN har Zone:Edit + Page Rules:Edit permissions
#   - jq er installert (brew install jq)
#
# Bruk:
#   export CLOUDFLARE_API_TOKEN="cfat_..."
#   ./scripts/setup-dns-cloudflare-pages.sh
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# --- Konfigurasjon ----------------------------------------------------------
DOMAIN="klarpakke.no"
WWW_DOMAIN="www.klarpakke.no"
PAGES_TARGET="klarpakke.pages.dev"

# Farger
G='\033[0;32m'
R='\033[0;31m'
Y='\033[1;33m'
C='\033[0;36m'
NC='\033[0m'

LOG_FILE="/tmp/klarpakke-dns-setup-$(date +%Y%m%d-%H%M%S).log"

log() { echo -e "$1" | tee -a "$LOG_FILE"; }

log ""
log "═══════════════════════════════════════════════════════════════"
log "  ☁️  Cloudflare Pages DNS Setup"
log "  ${C}$WWW_DOMAIN${NC} + ${C}$DOMAIN${NC} → ${C}$PAGES_TARGET${NC}"
log "═══════════════════════════════════════════════════════════════"
log ""

# --- Sjekk avhengigheter ----------------------------------------------------

if ! command -v jq &>/dev/null; then
  log "${R}❌ jq er ikke installert${NC}"
  log "   Installer: brew install jq"
  exit 1
fi

if ! command -v curl &>/dev/null; then
  log "${R}❌ curl er ikke installert${NC}"
  exit 1
fi

# --- API Token --------------------------------------------------------------

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  if [ -f ".env.local" ]; then
    TOKEN_LINE=$(grep -E '^CLOUDFLARE_API_TOKEN=' .env.local 2>/dev/null | head -1 || true)
    if [ -n "$TOKEN_LINE" ]; then
      export CLOUDFLARE_API_TOKEN="${TOKEN_LINE#*=}"
    fi
  fi
fi

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  log "${R}❌ CLOUDFLARE_API_TOKEN ikke funnet!${NC}"
  log ""
  log "Sett tokenet som miljøvariabel:"
  log "  export CLOUDFLARE_API_TOKEN='cfat_XXX...'"
  log ""
  log "Tokenet trenger disse permissions:"
  log "  - Zone:Edit (for DNS records)"
  log "  - Page Rules:Edit (for redirects)"
  exit 1
fi

log "${G}✅ API token funnet${NC}"
log ""

# --- API helper -------------------------------------------------------------

cf_api() {
  local method="$1"
  local endpoint="$2"
  local data="${3:-}"

  local curl_opts=(
    -s
    -X "$method"
    "https://api.cloudflare.com/client/v4${endpoint}"
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
    -H "Content-Type: application/json"
  )

  if [ -n "$data" ]; then
    curl "${curl_opts[@]}" -d "$data"
  else
    curl "${curl_opts[@]}"
  fi
}

# --- STEG 1: Hent Zone ID ---------------------------------------------------

log "${C}🔍 STEG 1: Henter Zone ID for $DOMAIN...${NC}"

ZONE_RESPONSE=$(cf_api GET "/zones?name=$DOMAIN")
ZONE_ID=$(echo "$ZONE_RESPONSE" | jq -r '.result[0].id // empty')
ZONE_STATUS=$(echo "$ZONE_RESPONSE" | jq -r '.result[0].status // empty')

if [ -z "$ZONE_ID" ]; then
  AUTH_SUCCESS=$(echo "$ZONE_RESPONSE" | jq -r '.success // false')
  if [ "$AUTH_SUCCESS" = "false" ]; then
    log "${R}❌ API-autentisering feilet!${NC}"
    log ""
    log "${Y}Årsak:${NC} Tokenet har ikke 'Zone:Edit' permission."
    log "        Pages Direct Upload-tokens (cfat_...) kan ikke endre DNS."
    log ""
    log "${C}Løsning:${NC} Du har to alternativer:"
    log ""
    log "  ${G}Alternativ A: Manuelt via Dashboard (anbefalt)${NC}"
    log "    1. Gå til https://dash.cloudflare.com"
    log "    2. Velg 'klarpakke.no' → DNS"
    log "    3. Slett gamle records for @ og www"
    log "    4. Legg til: CNAME www → klarpakke.pages.dev (proxied)"
    log "    5. Legg til: CNAME @   → klarpakke.pages.dev (proxied)"
    log "    6. Gå til Pages → klarpakke → Custom Domains"
    log "    7. Legg til: klarpakke.no og www.klarpakke.no"
    log ""
    log "  ${G}Alternativ B: Nytt API Token${NC}"
    log "    1. Gå til https://dash.cloudflare.com/profile/api-tokens"
    log "    2. Klikk 'Create Token' → 'Create Custom Token'"
    log "    3. Permissions: Zone:Edit (for klarpakke.no)"
    log "    4. Kopier token og kjør:"
    log "       export CLOUDFLARE_API_TOKEN='din_nye_token'"
    log "       ./scripts/setup-dns-cloudflare-pages.sh"
  else
    log "${R}❌ Kunne ikke finne zone for $DOMAIN${NC}"
    log "   Response: $(echo "$ZONE_RESPONSE" | jq -c '.errors // .messages')"
  fi
  exit 1
fi

log "${G}✅ Zone ID: $ZONE_ID${NC}"
log "   Status: $ZONE_STATUS"
log ""

# --- STEG 2: Vis nåværende records ------------------------------------------

log "${C}🔍 STEG 2: Nåværende DNS records...${NC}"

ALL_RECORDS=$(cf_api GET "/zones/$ZONE_ID/dns_records?per_page=100")

echo "$ALL_RECORDS" | jq -r '
  .result[] |
  select(.name == "'$DOMAIN'" or .name == "'$WWW_DOMAIN'") |
  "  \(.type)  \(.name)  →  \(.content)  (proxied: \(.proxied), TTL: \(.ttl))"
' | tee -a "$LOG_FILE"

log ""

# --- STEG 3: Slett gamle A/CNAME for www + apex -----------------------------

log "${C}🔍 STEG 3: Sletter gamle Vercel-pekende records...${NC}"

# Hent alle record IDs for www og apex
TO_DELETE=$(echo "$ALL_RECORDS" | jq -r '
  .result[] |
  select(
    (.name == "'$DOMAIN'" or .name == "'$WWW_DOMAIN'") and
    (.type == "A" or .type == "CNAME")
  ) |
  .id
')

if [ -n "$TO_DELETE" ]; then
  for record_id in $TO_DELETE; do
    RECORD_INFO=$(cf_api GET "/zones/$ZONE_ID/dns_records/$record_id")
    RECORD_NAME=$(echo "$RECORD_INFO" | jq -r '.result.name // "unknown"')
    RECORD_TYPE=$(echo "$RECORD_INFO" | jq -r '.result.type // "unknown"')
    RECORD_CONTENT=$(echo "$RECORD_INFO" | jq -r '.result.content // "unknown"')
    log "  🗑️  Sletter $RECORD_TYPE $RECORD_NAME → $RECORD_CONTENT"
    cf_api DELETE "/zones/$ZONE_ID/dns_records/$record_id" > /dev/null
  done
  COUNT=$(echo "$TO_DELETE" | wc -l | tr -d ' ')
  log "${G}✅ Slettet $COUNT record(s)${NC}"
else
  log "${Y}⚠️  Ingen A/CNAME records å slette${NC}"
fi
log ""

# --- STEG 4: Opprett nye CNAME records --------------------------------------

log "${C}🔍 STEG 4: Oppretter nye CNAME records...${NC}"

# 4a: www CNAME
create_record() {
  local name="$1"
  local type="$2"
  local content="$3"

  log "  ➕ $type  $name  →  $content  (proxied)"

  RESPONSE=$(cf_api POST "/zones/$ZONE_ID/dns_records" "{
    \"type\": \"$type\",
    \"name\": \"$name\",
    \"content\": \"$content\",
    \"ttl\": 1,
    \"proxied\": true
  }")

  SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
  ERROR=$(echo "$RESPONSE" | jq -r '.errors[0].message // empty')

  if [ "$SUCCESS" = "true" ]; then
    log "     ${G}✅ Opprettet${NC}"
    return 0
  else
    log "     ${R}❌ Feil: $ERROR${NC}"
    return 1
  fi
}

# www CNAME
create_record "www" "CNAME" "$PAGES_TARGET" || true

# Apex CNAME (Cloudflare flattener automatisk til A-records)
create_record "@" "CNAME" "$PAGES_TARGET" || true

log ""

# --- STEG 5: Legg til Page Rule for redirect ---------------------------------

log "${C}🔍 STEG 5: Konfigurerer Page Rule (www → apex redirect)...${NC}"

# Sjekk om det finnes en eksisterende redirect page rule
PAGE_RULES=$(cf_api GET "/zones/$ZONE_ID/pagerules")
EXISTS=$(echo "$PAGE_RULES" | jq -r '.result[]? | select(.targets[0].constraint.value | contains("'$WWW_DOMAIN'")) | .id' | head -1)

if [ -n "$EXISTS" ]; then
  log "  ℹ️  Sletter eksisterende page rule: $EXISTS"
  cf_api DELETE "/zones/$ZONE_ID/pagerules/$EXISTS" > /dev/null
fi

# Opprett ny: www.klarpakke.no/* → klarpakke.no/$1 (301 redirect)
log "  ➕ Oppretter redirect: $WWW_DOMAIN/* → $DOMAIN/\$1"
PR_RESPONSE=$(cf_api POST "/zones/$ZONE_ID/pagerules" '{
  "targets": [
    {
      "target": "url",
      "constraint": {
        "operator": "matches",
        "value": "https://www.klarpakke.no/*"
      }
    }
  ],
  "actions": [
    {
      "id": "forwarding_url",
      "value": {
        "url": "https://klarpakke.no/$1",
        "status_code": 301
      }
    }
  ],
  "priority": 1,
  "status": "active"
}')

PR_SUCCESS=$(echo "$PR_RESPONSE" | jq -r '.success // false')
if [ "$PR_SUCCESS" = "true" ]; then
  log "     ${G}✅ Page rule opprettet${NC}"
else
  PR_ERR=$(echo "$PR_RESPONSE" | jq -r '.errors[0].message // "ukjent feil"')
  log "     ${Y}⚠️  Page rule feilet: $PR_ERR${NC}"
  log "     (Du kan legge til redirect manuelt i Cloudflare Dashboard)"
fi

log ""

# --- STEG 6: Legg til custom domain i Cloudflare Pages ----------------------

log "${C}🔍 STEG 6: Registrerer custom domains i Cloudflare Pages...${NC}"

# Hent Pages-prosjekt info for å finne project_id
PROJECTS=$(cf_api GET "/accounts")
ACCOUNT_ID=$(echo "$PROJECTS" | jq -r '.result[0].id // empty')

if [ -n "$ACCOUNT_ID" ]; then
  log "  ℹ️  Account ID: $ACCOUNT_ID"

  # Prøv å legge til custom domain via Pages API
  DOMAIN_RESPONSE=$(cf_api POST "/accounts/$ACCOUNT_ID/pages/projects/klarpakke/domains" "{
    \"name\": \"$DOMAIN\"
  }" 2>/dev/null || true)

  WWW_DOMAIN_RESPONSE=$(cf_api POST "/accounts/$ACCOUNT_ID/pages/projects/klarpakke/domains" "{
    \"name\": \"$WWW_DOMAIN\"
  }" 2>/dev/null || true)

  log "  ${G}✅ Custom domain registrering forespurt${NC}"
  log "     (Verifisering kan ta 1-5 minutter)"
else
  log "  ${Y}⚠️  Kunne ikke finne Account ID — legg til domener manuelt:${NC}"
  log "     https://dash.cloudflare.com → Pages → klarpakke → Custom Domains"
fi

log ""

# --- STEG 7: Verifiser ------------------------------------------------------

log "${C}🔍 STEG 7: Verifiserer DNS-oppslag...${NC}"
log ""

sleep 3

log "  dig CNAME $WWW_DOMAIN:"
dig +short CNAME "$WWW_DOMAIN" 2>/dev/null | sed 's/^/    /' | tee -a "$LOG_FILE"

log ""
log "  dig A $DOMAIN (apex, flattened):"
dig +short A "$DOMAIN" 2>/dev/null | sed 's/^/    /' | tee -a "$LOG_FILE"

log ""

# --- Oppsummering -----------------------------------------------------------

log "═══════════════════════════════════════════════════════════════"
log "${G}✅ DNS-SETUP FULLFØRT!${NC}"
log "═══════════════════════════════════════════════════════════════"
log ""
log "Konfigurasjon:"
log "  ${C}CNAME${NC}  www.$DOMAIN         →  $PAGES_TARGET  (proxied)"
log "  ${C}CNAME${NC}  $DOMAIN (apex)      →  $PAGES_TARGET  (proxied, flattened)"
log "  ${C}Page Rule${NC} $WWW_DOMAIN/*     →  $DOMAIN/\$1   (301)"
log ""
log "Viktig:"
log "  1. Gå til ${C}https://dash.cloudflare.com${NC}"
log "  2. Velg ${C}$DOMAIN${NC} → ${C}DNS${NC} for å verifisere records"
log "  3. Gå til ${C}Pages → klarpakke → Custom Domains${NC}"
log "  4. Legg til: ${C}$DOMAIN${NC} og ${C}$WWW_DOMAIN${NC}"
log "  5. Vent på verifisering (1-5 minutter)"
log ""
log "Test:"
log "  curl -I https://$DOMAIN/no/"
log "  curl -I https://$WWW_DOMAIN/no/  (skal redirecte til apex)"
log ""
log "Logg: $LOG_FILE"
log ""
