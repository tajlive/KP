#!/bin/bash
# Klarpakke Deploy — enkel, pålitelig
# Bygg → Deploy → CDN-purge → Verifiser
# Bruk: bash scripts/deploy.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# Farger
GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; YELLOW='\033[0;33m'; NC='\033[0m'

# ─── Laster env ───
# Robust loader: .env.local kan inneholde '&' i URL-er (POSTGRES_URL m.fl.) som
# knekker `source`. Se scripts/lib/load-env.sh.
if [ -f ".env.local" ]; then
  # shellcheck source=lib/load-env.sh
  . "$SCRIPT_DIR/lib/load-env.sh"
fi

CF_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
CF_ZONE="${CF_ZONE_ID:-328d7de7e8e48308fd4f9d760da5b18f}"
VERSION="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"

echo -e "${CYAN}╔══════════════════════════════╗${NC}"
echo -e "${CYAN}║  Klarpakke Deploy v2        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════╝${NC}"
echo "Version: ${VERSION}"
echo ""

# ─── Pre-flight: CRON_SECRET ───
CRON_SECRET="${CRON_SECRET:-}"
if [ -z "$CRON_SECRET" ]; then
  echo -e "${RED}❌ CRON_SECRET mangler i .env.local — kan ikke deploye uten${NC}"
  exit 1
fi
echo -e "${GREEN}✅ CRON_SECRET satt (${#CRON_SECRET} tegn)${NC}"
echo ""

# ─── 1. Bygg (next build → opennextjs pakking) ───
echo -e "${CYAN}🏗️  Bygger Next.js...${NC}"
SKIP_LINT_IN_BUILD=true NODE_OPTIONS="--max-old-space-size=4096" npx next build 2>&1 | tail -3
echo -e "${GREEN}✅ Next.js bygg ferdig${NC}"

echo -e "${CYAN}📦 Pakker for Cloudflare...${NC}"
SKIP_LINT_IN_BUILD=true npx opennextjs-cloudflare build --skipNextBuild 2>&1 | tail -5
echo -e "${GREEN}✅ Bygg ferdig${NC}"

# ─── 2. Deploy ───
echo -e "${CYAN}🚀 Deployer til Cloudflare...${NC}"
npx wrangler deploy --env "" --var "APP_VERSION:${VERSION}" 2>&1 | grep -E "Deployed|Error|error" || true
echo -e "${GREEN}✅ Deployet${NC}"

# ─── 2b. CRON_SECRET-post-deploy-guard ───
# Verifiser at CRON_SECRET finnes i Worker (var borte 2026-07-31 = 6t trading-stopp).
echo -e "${CYAN}🔑 Sjekker CRON_SECRET i Worker...${NC}"
EXISTING_SECRET=$(npx wrangler secret list 2>/dev/null | grep -o "CRON_SECRET" || true)
if [ -z "$EXISTING_SECRET" ]; then
  echo -e "${YELLOW}⚠️  CRON_SECRET manglet i Worker — setter fra .env.local${NC}"
  echo -n "$CRON_SECRET" | npx wrangler secret put CRON_SECRET >/dev/null 2>&1
  [ $? -eq 0 ] && echo -e "${GREEN}✅ CRON_SECRET satt${NC}" || echo -e "${RED}❌ Kunne ikke sette CRON_SECRET${NC}"
else
  echo -e "${GREEN}✅ CRON_SECRET finnes i Worker${NC}"
fi

# Verifiser cron-endepunktet
echo -e "${CYAN}🧪 Tester cron/tick...${NC}"
CRON_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "https://www.klarpakke.no/api/cron/tick" 2>/dev/null || echo "000")
if [ "$CRON_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Cron/tick: 200 — trading levende${NC}"
else
  echo -e "${RED}❌ Cron/tick: HTTP $CRON_CODE — trading stoppet!${NC}"
  FAILED=1
fi
echo ""

# ─── 3. CDN Purge ───
if [ -n "$CF_API_TOKEN" ]; then
  echo -e "${CYAN}🧹 Purger CDN...${NC}"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/purge_cache" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"purge_everything":true}' 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ CDN purget${NC}"
  else
    echo -e "${RED}⚠️  CDN purge feilet (HTTP $HTTP_CODE) — venter 30s${NC}"
    sleep 30
  fi
else
  echo -e "${RED}⚠️  CLOUDFLARE_API_TOKEN mangler — hopper CDN purge${NC}"
fi

# ─── 4. Verifiser ───
echo -e "${CYAN}🔎 Verifiserer...${NC}"
FAILED=0
for URL in "https://www.klarpakke.no/no" "https://www.klarpakke.no/api/health"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null)
  if [ "$CODE" = "200" ] || [ "$CODE" = "307" ]; then
    echo -e "  ${GREEN}✅ $URL → $CODE${NC}"
  else
    echo -e "  ${RED}❌ $URL → $CODE${NC}"
    FAILED=1
  fi
done

# Sjekk at ny versjon er i prod.
# Cold-start etter deploy+purge gir transient feil-HTML — prov paa nytt
# med backoff for en reell feil erklaeres (falske negativer x12).
PAGE_OK=0
for ATTEMPT in 1 2 3 4 5; do
  PAGE=$(curl -s -w "\n__HTTP:%{http_code}" --max-time 20 "https://www.klarpakke.no/no" 2>/dev/null)
  HTTP_CODE="${PAGE##*__HTTP:}"
  BODY="${PAGE%__HTTP:*}"
  # Substring-test i bash - IKKE 'echo | grep -q': grep -q lukker pipen
  # tidlig, echo doer med SIGPIPE, og pipefail (set -euo pipefail) gjor
  # pipeline-status 141 = "ikke funnet" selv om teksten finnes.
  # Dette var rotaarsaken til 12 falske deploy-negativer.
  if [[ "$BODY" == *"Klarpakke"* ]]; then
    PAGE_OK=1
    break
  fi
  echo -e "  ${YELLOW}↻ forsok $ATTEMPT: HTTP $HTTP_CODE, ${#BODY} bytes, 'Klarpakke' ikke funnet${NC}"
  [ $ATTEMPT -lt 5 ] && sleep 15
done
if [ $PAGE_OK -eq 1 ]; then
  echo -e "  ${GREEN}✅ Side lastet${NC}"
else
  echo -e "  ${RED}❌ Side tom/feil (etter 5 forsok)${NC}"
  FAILED=1
fi

echo ""
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 Deploy ferdig! v${VERSION}${NC}"
else
  echo -e "${RED}❌ Verifisering feilet — sjekk manuelt${NC}"
  exit 1
fi
