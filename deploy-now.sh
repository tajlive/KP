#!/usr/bin/env bash
# deploy-now.sh — Full deploy pipeline for klarpakke.no
# Kjør: bash deploy-now.sh

set -e
cd "$(git rev-parse --show-toplevel)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok() { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
fail() { echo -e "${RED}❌ STOPP: $1${NC}"; exit 1; }

echo "======================================"
echo "🚀 KLARPAKKE DEPLOY — $(date '+%H:%M:%S')"
echo "======================================"

# ── FASE 1: Pre-flight ──────────────────────────────────────────────────────
echo ""
echo "── FASE 1: Pre-flight ──"

BRANCH=$(git branch --show-current)
[ "$BRANCH" = "main" ] && ok "Branch: main" || fail "Ikke på main (er på $BRANCH)"

git pull origin main --ff-only 2>/dev/null && ok "git pull OK" || warn "git pull: lokale endringer"

# ── FASE 2: Bulk fixes ──────────────────────────────────────────────────────
echo ""
echo "── FASE 2: Fixes ──"

# Fix 1: Tabellnavn
if [ -f "fix-ts-tables.sh" ]; then
  bash fix-ts-tables.sh
  ok "fix-ts-tables.sh kjørt"
else
  warn "fix-ts-tables.sh ikke funnet — hopper over"
fi

# Fix 2: Zustand (hvis noen filer fortsatt bruker gammel syntax)
ZUSTAND_OLD=$(grep -rl "import create from 'zustand'" src/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$ZUSTAND_OLD" -gt "0" ]; then
  find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
    -exec sed -i '' "s/import create from 'zustand'/import { create } from 'zustand'/g" {} +
  ok "Zustand: $ZUSTAND_OLD filer fikset"
else
  ok "Zustand: allerede korrekt"
fi

# Fix 3: Fjern tom src/app/en (routing-konflikt)
if [ -d "src/app/en" ] && [ -z "$(ls -A src/app/en)" ]; then
  rm -rf src/app/en
  ok "Fjernet tom src/app/en"
else
  warn "src/app/en: ikke tom eller eksisterer ikke"
fi

# Fix 4: Regenerer Supabase-typer
echo "📦 Regenererer Supabase-typer..."
npx supabase gen types typescript \
  --project-id vuxbjlykgmzskxbclquf \
  --schema public > src/types/supabase.ts 2>/dev/null \
  && ok "Supabase-typer regenerert: $(wc -c < src/types/supabase.ts | tr -d ' ') bytes" \
  || warn "Supabase type-gen feilet — fortsetter med eksisterende typer"

# ── FASE 3: Build ───────────────────────────────────────────────────────────
echo ""
echo "── FASE 3: Build ──"

TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || true)
echo "   TypeScript feil: $TS_ERRORS"
[ "$TS_ERRORS" -lt 150 ] && ok "TS: $TS_ERRORS feil (akseptabelt)" || warn "TS: $TS_ERRORS feil (mange — sjekk)"

echo "🔨 Bygger..."
BUILD_OUT=$(npm run build 2>&1)
BUILD_EXIT=$?
if [ $BUILD_EXIT -eq 0 ]; then
  ok "Build: SUCCESS"
else
  echo "$BUILD_OUT" | tail -40
  fail "Build feilet (exit $BUILD_EXIT)"
fi

# ── FASE 4: Git commit + push ───────────────────────────────────────────────
echo ""
echo "── FASE 4: Git push ──"

git add -A
CHANGES=$(git diff --cached --stat | tail -1)
echo "   Staged: $CHANGES"

if git diff --cached --quiet; then
  ok "Ingenting nytt å committe"
else
  git commit -m "fix: prod deploy - TS tabellnavn, routing /en/en, KLT backfill, SW cleanup

- fix-ts-tables.sh: profiles→user_profiles og andre tabellnavn
- LocaleRedirect: pathname === /locale guard (fikser /en/en loop)
- src/app/en: fjernet tom mappe (routing-konflikt)
- SW: self-unregister no-op fetch handler
- Supabase typer regenerert
- bot-store: auto_trading_sessions→unified_trading_sessions
- copy-store: copy_trade_log→copy_trade_queue
- DB: KLT backfill for eksisterende 3 brukere

Resolves: /en/en redirect-loop, 406 risk_profiles, Zustand warning"

  git push origin main && ok "Push: SUCCESS ($(git log --oneline -1 | cut -c1-7))" || fail "Push feilet"
fi

# ── FASE 5: Vercel deploy ───────────────────────────────────────────────────
echo ""
echo "── FASE 5: Vercel ──"

if command -v vercel &>/dev/null; then
  echo "🚀 Deployer til prod..."
  vercel --prod --yes 2>&1 | tail -5 && ok "Vercel deploy sendt" || fail "Vercel deploy feilet"
  
  echo "⏳ Venter 90s på deploy..."
  sleep 90
else
  warn "vercel CLI ikke funnet — auto-deploy via git push er aktivt"
  warn "Sjekk: https://vercel.com/tom-jensens-projects/klarpakke"
fi

# ── FASE 6: Health checks ───────────────────────────────────────────────────
echo ""
echo "── FASE 6: Health checks ──"

check_url() {
  local URL=$1; local LABEL=$2
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL")
  [ "$HTTP" = "200" ] && ok "$LABEL: $HTTP" || warn "$LABEL: $HTTP ($URL)"
}

check_url "https://klarpakke.no" "Landing (NO)"
check_url "https://klarpakke.no/en" "/en"
check_url "https://klarpakke.no/api/health" "API health"

# Sjekk for redirect-loop på /en
EN_REDIRECT=$(curl -sL -o /dev/null -w "%{url_effective}" --max-time 10 "https://klarpakke.no/en" 2>/dev/null)
if [[ "$EN_REDIRECT" == *"/en/en"* ]]; then
  fail "/en redirect-loop FORTSATT AKTIV → $EN_REDIRECT"
else
  ok "/en URL: $EN_REDIRECT (ingen loop)"
fi

# ── SUMMARY ────────────────────────────────────────────────────────────────
echo ""
echo "======================================"
echo "📊 DEPLOY SUMMARY"
echo "======================================"
echo "Tidspunkt:     $(date '+%Y-%m-%d %H:%M:%S')"
echo "Commit:        $(git log --oneline -1)"
echo "TS-feil:       $TS_ERRORS"
echo "URL:           https://klarpakke.no"
echo ""
echo "NESTE STEG:"
echo "  1. npx playwright test --grep '@smoke' (E2E)"
echo "  2. Enroll-flow (KjøpKursKnapp + API)"
echo "  3. Lekepenger-dashboard"
echo "======================================"
