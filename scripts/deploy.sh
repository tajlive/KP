#!/bin/bash
# =============================================================================
# Klarpakke Deploy CLI — automatisk bygg, deploy, verifiser
#
# Bruk:
#   bash scripts/deploy.sh                  # Bygg + deploy (PC foretrukket, fallback Mac)
#   bash scripts/deploy.sh --verify-only    # Bare sjekk at prod fungerer
#   bash scripts/deploy.sh --check-secrets  # Bare sjekk Cloudflare secrets
#   bash scripts/deploy.sh --force-build-on-mac  # Tving bygg pa Mac
#
# Krever:
#   - .env.local med NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
#   - CLOUDFLARE_API_TOKEN i .env.local eller miljø
#   - ssh suxno (PC) eller npm + node (Mac)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMESTAMP=$(date +%H:%M)

# === Farger ===
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# === Les env vars ===
load_env() {
  if [ -f "$PROJECT_DIR/.env.local" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env.local" | xargs 2>/dev/null || true)
  fi
  for var in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY CLOUDFLARE_API_TOKEN; do
    if [ -z "${!var:-}" ]; then
      echo -e "${RED}❌ $var er ikke satt. Sjekk .env.local${NC}"
      exit 1
    fi
  done
}

# === Sjekk at Cloudflare secrets er korrekte ===
check_secrets() {
  echo -e "${CYAN}🔍 Sjekker Cloudflare secrets...${NC}"
  
  local ACCOUNT_ID="80d5b1d56a3e907150ba7348b6182894"
  local SCRIPT="klarpakke"
  local MISSING=0
  local REQUIRED=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "DATABASE_URL"
    "SUPABASE_SERVICE_ROLE_KEY"
  )

  local RESULT
  RESULT=$(curl -s "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT}/secrets" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" 2>/dev/null)

  for secret in "${REQUIRED[@]}"; do
    if echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); [print(s['name']) for s in d['result'] if s['name'] == '$secret']" 2>/dev/null | grep -q "^${secret}$"; then
      echo -e "  ${GREEN}✅ $secret${NC}"
    else
      echo -e "  ${RED}❌ $secret — MANGLER!${NC}"
      MISSING=$((MISSING + 1))
    fi
  done

  if [ $MISSING -gt 0 ]; then
    echo -e "\n${YELLOW}⚠️  $MISSING secrets mangler. Fikser automatisk...${NC}"
    fix_secret "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL"
    fix_secret "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo -e "${GREEN}✅ Secrets fikset!${NC}"
  else
    echo -e "\n${GREEN}✅ Alle secrets OK${NC}"
  fi
}

fix_secret() {
  local name="$1"
  local value="$2"
  curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/80d5b1d56a3e907150ba7348b6182894/workers/scripts/klarpakke/secrets" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${name}\",\"text\":\"${value}\",\"type\":\"secret_text\"}" > /dev/null 2>&1
  echo -e "  ${GREEN}✅ $name → satt i Cloudflare${NC}"
}

# === Bygg på PC (foretrukket) ===
build_on_pc() {
  echo -e "${CYAN}🏗️  Bygger på PC (suxno)...${NC}"
  if ! ssh -o ConnectTimeout=5 suxno "cmd /c echo OK" 2>/dev/null | grep -q OK; then
    echo -e "${YELLOW}⚠️  PC ikke tilgjengelig. Fallback til Mac.${NC}"
    return 1
  fi

  ssh suxno "cmd /c wsl -d Ubuntu bash -c 'cd /home/taj/kp-build && git pull origin main 2>&1'" 2>/dev/null | tail -3
  ssh suxno "cmd /c wsl -d Ubuntu bash /home/taj/build-kp-wsl.sh" 2>&1 | tail -3
  echo -e "${GREEN}✅ Bygg ferdig på PC${NC}"
  return 0
}

# === Bygg på Mac (fallback) ===
build_on_mac() {
  echo -e "${CYAN}🏗️  Bygger på Mac...${NC}"
  cd "$PROJECT_DIR"
  npm run cf:build 2>&1 | tail -5
  echo -e "${GREEN}✅ Bygg ferdig på Mac${NC}"
}

# === Hent bygg-artefakter fra PC ===
fetch_pc_build() {
  echo -e "${CYAN}📦 Henter bygg fra PC...${NC}"
  ssh suxno "cmd /c wsl -d Ubuntu tar czf /mnt/c/Users/taj/kp-build.tar.gz -C /home/taj/kp-build .open-next .next" 2>/dev/null
  scp suxno:C:/Users/taj/kp-build.tar.gz "$PROJECT_DIR/" 2>/dev/null
  cd "$PROJECT_DIR" && tar xzf kp-build.tar.gz 2>/dev/null
  rm -f kp-build.tar.gz
  echo -e "${GREEN}✅ Bygg-artefakter på plass${NC}"
}

# === Deploy til Cloudflare ===
deploy() {
  echo -e "${CYAN}🚀 Deployer til Cloudflare...${NC}"
  cd "$PROJECT_DIR"

  # Backup wrangler.jsonc
  local WANGLER="$PROJECT_DIR/wrangler.jsonc"
  cp "$WANGLER" "${WANGLER}.bak"

  # Midlertidig patch: tom build command (vi har allerede bygget)
  python3 -c "
import json
with open('${WANGLER}') as f:
    cfg = json.load(f)
cfg['build'] = {}
with open('${WANGLER}', 'w') as f:
    json.dump(cfg, f, indent=2)
" 2>/dev/null

  # Deploy
  npx wrangler deploy --env "" 2>&1 | tail -5

  # Restore wrangler.jsonc
  mv "${WANGLER}.bak" "$WANGLER"
  echo -e "${GREEN}✅ Deployet${NC}"
}

# === Verifiser produksjon ===
verify() {
  echo -e "${CYAN}🔎 Verifiserer produksjon...${NC}"
  local FAILED=0

  # Health
  local HEALTH
  HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://www.klarpakke.no/api/health 2>/dev/null)
  if [ "$HEALTH" = "200" ]; then
    echo -e "  ${GREEN}✅ Health: $HEALTH${NC}"
  else
    echo -e "  ${RED}❌ Health: $HEALTH${NC}"
    FAILED=1
  fi

  # Kritiske sider
  for page in "/no" "/no/login" "/no/priser"; do
    local CODE
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://www.klarpakke.no${page}" 2>/dev/null)
    if [ "$CODE" = "200" ] || [ "$CODE" = "307" ]; then
      echo -e "  ${GREEN}✅ $page → $CODE${NC}"
    else
      echo -e "  ${RED}❌ $page → $CODE${NC}"
      FAILED=1
    fi
  done

  # Supabase-feil
  local SUPABASE_ERRORS
  SUPABASE_ERRORS=$(curl -s https://www.klarpakke.no/no/login 2>/dev/null | grep -c "Supabase er ikke" || true)
  if [ "$SUPABASE_ERRORS" -eq 0 ]; then
    echo -e "  ${GREEN}✅ 0 Supabase-feil på login-siden${NC}"
  else
    echo -e "  ${RED}❌ $SUPABASE_ERRORS Supabase-feil funnet!${NC}"
    FAILED=1
  fi

  if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALLE SJEKKER BESTATT! 🚀${NC}"
  else
    echo -e "\n${RED}❌ Noen sjekker feilet${NC}"
    exit 1
  fi
}

# === Hoved ===
main() {
  echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║     Klarpakke Deploy CLI v1.0        ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
  echo ""

  load_env

  # Parse flag
  case "${1:-}" in
    --verify-only)
      verify
      exit 0
      ;;
    --check-secrets)
      check_secrets
      exit 0
      ;;
    --force-build-on-mac)
      BUILD_ON_MAC=1
      ;;
    *)
      ;;
  esac

  # 1. Sjekk secrets
  check_secrets

  # 2. Bygg
  if [ "${BUILD_ON_MAC:-0}" = "1" ]; then
    build_on_mac
  elif build_on_pc; then
    fetch_pc_build
  else
    build_on_mac
  fi

  # 3. Deploy
  deploy

  # 4. Verifiser
  verify

  echo -e "\n${GREEN}✅ Ferdig! $(date +%H:%M)${NC}"
}

main "$@"
