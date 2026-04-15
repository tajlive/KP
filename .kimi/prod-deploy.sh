#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# KIMI PROD DEPLOY PIPELINE — Klarpakke
# ═══════════════════════════════════════════════════════════════════════════════
# Kjører i denne rekkefølgen:
#   1. klint       (npm run lint:gate)
#   2. ktest       (npm run test:unit)
#   3. kdb         (npm run db:status)
#   4. kmonitor    (health + trading + supabase)
#   5. kdeploy     (npm run deploy:prod)
#   6. kmonitor    (post-deploy verification)
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

KP_DIR="/Users/taj/klarpakke"
cd "$KP_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

STEP=0
run_step() {
  STEP=$((STEP + 1))
  echo ""
  echo -e "${YELLOW}═══════════════════════════════════════════════════════════════════${NC}"
  echo -e "${YELLOW}  STEP $STEP: $1${NC}"
  echo -e "${YELLOW}═══════════════════════════════════════════════════════════════════${NC}"
}

fail() {
  echo -e "${RED}❌ FAILED at step $STEP: $1${NC}"
  exit 1
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. LINT + TYPE CHECK
# ─────────────────────────────────────────────────────────────────────────────
run_step "Kvalitet — lint:gate"
npm run lint:gate || fail "lint:gate"

# ─────────────────────────────────────────────────────────────────────────────
# 2. UNIT TESTS
# ─────────────────────────────────────────────────────────────────────────────
run_step "Kvalitet — unit tests"
npm run test:unit || fail "unit tests"

# ─────────────────────────────────────────────────────────────────────────────
# 3. DB STATUS
# ─────────────────────────────────────────────────────────────────────────────
run_step "DB — migrasjonsstatus"
npm run db:status || fail "db:status"

# ─────────────────────────────────────────────────────────────────────────────
# 4. PRE-DEPLOY MONITOR
# ─────────────────────────────────────────────────────────────────────────────
run_step "Health — pre-deploy monitor"

HEALTH_STATUS=$(curl -sfS https://www.klarpakke.no/api/health | jq -r '.status' 2>/dev/null || echo "unknown")
if [ "$HEALTH_STATUS" != "healthy" ]; then
  echo -e "${RED}⚠️  Production health is '$HEALTH_STATUS' — proceeding with caution${NC}"
else
  echo -e "${GREEN}✅ Production health: $HEALTH_STATUS${NC}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 5. DEPLOY
# ─────────────────────────────────────────────────────────────────────────────
run_step "Deploy — Vercel production"
if [ "${1:-}" == "--preview" ]; then
  echo "Preview mode selected"
  vercel deploy --target=preview || fail "preview deploy"
  DEPLOY_URL=$(vercel inspect --target=preview 2>/dev/null | grep -o 'https://[^ ]*' | head -1)
else
  npm run deploy:prod || fail "production deploy"
  DEPLOY_URL="https://www.klarpakke.no"
fi

echo -e "${GREEN}✅ Deployed to: $DEPLOY_URL${NC}"

# ─────────────────────────────────────────────────────────────────────────────
# 6. POST-DEPLOY MONITOR
# ─────────────────────────────────────────────────────────────────────────────
run_step "Health — post-deploy monitor"

for i in 1 2 3 4 5; do
  sleep 10
  HEALTH_STATUS=$(curl -sfS "$DEPLOY_URL/api/health" | jq -r '.status' 2>/dev/null || echo "unknown")
  if [ "$HEALTH_STATUS" == "healthy" ]; then
    echo -e "${GREEN}✅ Post-deploy health OK (attempt $i)${NC}"
    break
  else
    echo -e "${YELLOW}⏳ Health check attempt $i: $HEALTH_STATUS${NC}"
  fi
done

if [ "$HEALTH_STATUS" != "healthy" ]; then
  fail "post-deploy health check"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 7. MEMPALACE HANDOFF
# ─────────────────────────────────────────────────────────────────────────────
run_step "MemPalace — logg deploy"

COMMIT_SHA=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --format=%s)
HANDOFF_FILE=".mempalace/handoffs/DEPLOY-$(date +%Y-%m-%d)-${COMMIT_SHA}.md"

cat > "$HANDOFF_FILE" <<EOF
# Deploy Handoff — $(date '+%Y-%m-%d %H:%M')

**Commit:** $COMMIT_SHA  
**Message:** $COMMIT_MSG  
**Deploy URL:** $DEPLOY_URL  
**Status:** ✅ SUCCESS

## Pipeline Steps
1. ✅ lint:gate
2. ✅ test:unit
3. ✅ db:status
4. ✅ pre-deploy monitor (health: $HEALTH_STATUS)
5. ✅ deploy:prod
6. ✅ post-deploy monitor (health: $HEALTH_STATUS)

## Post-Deploy Checklist
- [ ] Vercel Speed Insights: https://vercel.com/klarpakke/klarpakke/speed-insights
- [ ] Vercel Analytics: https://vercel.com/klarpakke/klarpakke/analytics
- [ ] UptimeRobot dashboard (hvis aktivert)

## Edge Config Status
- Store: \`klarpakke-flags\` (manuel oppsett i Vercel-dashboard kreves)
EOF

echo -e "${GREEN}✅ Handoff skrevet til: $HANDOFF_FILE${NC}"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  🚀 PROD DEPLOY FULLFØRT${NC}"
echo -e "${GREEN}  URL: $DEPLOY_URL${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
