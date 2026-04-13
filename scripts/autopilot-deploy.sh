#!/bin/bash
# =============================================================================
# KLARPAKKE — AUTOPILOT DEPLOY
# Kjøres via: bash scripts/autopilot-deploy.sh [--skip-tests] [--preview]
# Kjør alltid fra repo-root: /Users/taj/klarpakke
# =============================================================================
set -euo pipefail

CD_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"
cd "$CD_ROOT"

# --- Flagg ---
SKIP_TESTS=false
TARGET="prod"
for arg in "$@"; do
  case $arg in
    --skip-tests) SKIP_TESTS=true ;;
    --preview)    TARGET="preview" ;;
  esac
done

# --- Farger ---
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}"; exit 1; }
info() { echo -e "${CYAN}➤  $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }

echo -e "${CYAN}"
echo '=========================================================='
echo '  KLARPAKKE — AUTOPILOT DEPLOY'
echo "  Target: $TARGET | $(date '+%Y-%m-%d %H:%M:%S')"
echo '=========================================================='
echo -e "${NC}"

# =============================================================================
# STEG 1: PREFLIGHT
# =============================================================================
info 'STEG 1/8: Preflight'

# Sjekk ucommittede filer
UNSTAGED=$(git status --porcelain | wc -l | tr -d ' ')
if [ "$UNSTAGED" -eq "0" ]; then
  warn 'Ingen ucommittede filer — ingenting å deploye. Avbryter.'
  exit 0
fi

ok "$UNSTAGED filer klare for commit"

# =============================================================================
# STEG 2: TYPESCRIPT
# =============================================================================
info 'STEG 2/8: TypeScript'
npx tsc --noEmit 2>&1 | tail -5
TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c 'error TS' || true)
if [ "$TS_ERRORS" -gt 0 ]; then
  fail "TypeScript: $TS_ERRORS feil. Fix før deploy."
fi
ok 'TypeScript: 0 feil'

# =============================================================================
# STEG 3: LINT
# =============================================================================
info 'STEG 3/8: Lint'
LINT_ERRORS=$(npm run lint 2>&1 | grep -c ' error ' || true)
if [ "$LINT_ERRORS" -gt 0 ]; then
  fail "Lint: $LINT_ERRORS errors. Kjør: npm run lint:fix"
fi
ok 'Lint: 0 errors'

# =============================================================================
# STEG 4: UNIT TESTS (kan hoppes over med --skip-tests)
# =============================================================================
if [ "$SKIP_TESTS" = false ]; then
  info 'STEG 4/8: Unit tests'
  npm run test:unit -- --run --reporter=dot 2>&1 | tail -5
  ok 'Tests: bestod'
else
  warn 'STEG 4/8: Tests hoppet over (--skip-tests)'
fi

# =============================================================================
# STEG 5: GIT COMMIT + PUSH
# =============================================================================
info 'STEG 5/8: Git commit og push'

# Auto-generert commit melding fra git diff
CHANGED_FILES=$(git diff --cached --name-only 2>/dev/null | head -5 || git status --porcelain | awk '{print $2}' | head -5)
FILE_COUNT=$(git status --porcelain | wc -l | tr -d ' ')
COMMIT_MSG="chore: autopilot deploy $(date '+%Y-%m-%d %H:%M') — $FILE_COUNT filer

Endrede filer (utvalg):
$CHANGED_FILES

[autopilot]"

git add -A
git status --short | head -20
git commit -m "$COMMIT_MSG"
git push origin main
ok 'Push til main: OK'

# =============================================================================
# STEG 6: VERCEL DEPLOY
# =============================================================================
info "STEG 6/8: Vercel deploy ($TARGET)"

if [ "$TARGET" = "preview" ]; then
  DEPLOY_OUTPUT=$(npx vercel --archive=tgz 2>&1)
else
  DEPLOY_OUTPUT=$(npx vercel --prod --archive=tgz 2>&1)
fi

DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -E 'https://.*vercel.app|https://.*klarpakke.no' | tail -1 || true)
echo "$DEPLOY_OUTPUT" | tail -10

if echo "$DEPLOY_OUTPUT" | grep -q 'Error\|error\|failed'; then
  fail 'Vercel deploy feilet. Sjekk output over.'
fi

ok "Deploy ferdig: $DEPLOY_URL"

# =============================================================================
# STEG 7: POST-DEPLOY HEALTH
# =============================================================================
info 'STEG 7/8: Post-deploy health checks'
sleep 10

# HTTP-sjekk
HTTP_STATUS=$(curl -sI https://www.klarpakke.no | head -1 | awk '{print $2}' || echo '000')
if [ "$HTTP_STATUS" != "200" ] && [ "$HTTP_STATUS" != "308" ]; then
  warn "klarpakke.no returnerte $HTTP_STATUS — sjekk manuelt"
else
  ok "klarpakke.no: HTTP $HTTP_STATUS"
fi

# Signals health
npm run signals:health 2>&1 | tail -10
SIGNAL_STATUS=$(npm run signals:health 2>&1 | grep -o 'healthy\|warning\|error' | head -1 || echo 'ukjent')
if [ "$SIGNAL_STATUS" = "error" ]; then
  warn 'Signal-engine rapporterer error — kjør: npm run signals:doctor'
else
  ok "Signals: $SIGNAL_STATUS"
fi

# =============================================================================
# STEG 8: MEMPALACE UPDATE
# =============================================================================
info 'STEG 8/8: MemPalace sync'
npm run mempalace:sync 2>&1 | tail -5
ok 'MemPalace: oppdatert'

# =============================================================================
# RAPPORT
# =============================================================================
echo ''
echo -e "${GREEN}"
echo '=========================================================='
echo '  ✅ AUTOPILOT DEPLOY FULLFØRT'
echo "  Target:  $TARGET"
echo "  URL:     $DEPLOY_URL"
echo "  Tid:     $(date '+%H:%M:%S')"
echo '  Neste:   npm run signals:health'
echo '=========================================================='
echo -e "${NC}"
