#!/usr/bin/env bash
# klarpakke-push-deploy.sh
# Kjør: cd ~/klarpakke && bash klarpakke-push-deploy.sh
set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
fail() { echo -e "${RED}❌ STOPP: $1${NC}"; exit 1; }
info() { echo -e "${CYAN}→  $1${NC}"; }

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗"
echo "║  KLARPAKKE — PUSH + DEPLOY               ║"
echo -e "╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Sanity checks ─────────────────────────────────────────────────────────────
BRANCH=$(git branch --show-current)
[ "$BRANCH" = "main" ] && ok "Branch: main" || fail "Ikke på main (er: $BRANCH) — kjør: git checkout main"

# ── Vis hva som er endret ─────────────────────────────────────────────────────
echo ""
info "Endrede filer siden siste commit:"
git diff --name-only HEAD
git ls-files --others --exclude-standard  # untracked

echo ""

# ── Fjern tom src/app/en ──────────────────────────────────────────────────────
if [ -d "src/app/en" ] && [ -z "$(ls -A src/app/en)" ]; then
  rm -rf src/app/en
  ok "Fjernet tom src/app/en (fikset /en/en redirect-loop)"
fi

# ── Supabase typer ────────────────────────────────────────────────────────────
info "Regenererer Supabase TypeScript-typer..."
npx supabase gen types typescript \
  --project-id vuxbjlykgmzskxbclquf \
  --schema public > src/types/supabase.ts 2>/dev/null \
  && ok "Supabase typer OK ($(wc -c < src/types/supabase.ts | tr -d ' ') bytes)" \
  || warn "Type-gen feilet — bruker eksisterende typer"

# ── Build-sjekk ───────────────────────────────────────────────────────────────
echo ""
info "Bygger produksjonsbygg..."
npm run build 2>&1 | tail -20
[ ${PIPESTATUS[0]} -eq 0 ] && ok "Build: OK" || fail "Build feilet — sjekk output over"

# ── Git commit + push ─────────────────────────────────────────────────────────
echo ""
git add -A
STAGED=$(git diff --cached --name-only | wc -l | tr -d ' ')

if [ "$STAGED" = "0" ]; then
  ok "Ingenting å committe (allerede up to date)"
else
  info "Committer $STAGED filer..."
  git commit -m "fix: referral-system + Binance RLS + backtest + deploy fixes

REFERRAL:
- referral_tracking: lagt til INSERT + UPDATE + service_role RLS policies
- auth/callback: leser kp_ref-cookie, kobler referred_user til referral_tracking
- GoldenTicket: URL peker nå på /{locale}/innlogging?ref=KODE (var /login?ref=)
- login/page.tsx: videresender ?ref= param til innlogging-siden
- InnloggingClient: lagrer ?ref i cookie (SameSite=Lax, overlever OAuth-redirect)
- lib/auth/utils.ts: SignUpCredentials støtter referralCode-felt
- DB trigger: on_auth_user_referral (ny bruker får +10 KLT ved referral)
- DB funksjon: complete_referral_reward (referrer får +50 KLT)

BINANCE/SIKKERHET:
- user_binance_keys: aktivert RLS (var åpen for alle!)
- binance_connections: aktivert RLS
- 5 policies per tabell (SELECT/INSERT/UPDATE/DELETE + service_role)

BACKTEST:
- BacktestDemoWidget.tsx: reelle CoinGecko-priser (BTC/ETH/SOL/BNB)
- Echte HODL, DCA ukentlig, Grid Trading-simulering
- Mørkt tema, coin-velger, 30/90/180/365 dager

ANDRE FIXES:
- bot-store: auto_trading_sessions → unified_trading_sessions
- copy-store: copy_trade_log → copy_trade_queue (fjernet 'as unknown')
- SW: self-unregister no-op fetch handler
- KLT backfill: 3 eksisterende brukere fikk 100 KLT
- src/app/en: fjernet tom mappe (routing-konflikt)

Resolves: referral-flow end-to-end, binance RLS-hole, /en/en redirect"

  ok "Commit OK: $(git log --oneline -1 | cut -c1-50)"

  info "Pusher til GitHub..."
  git push origin main \
    && ok "Push til github.com/tajlive/KP: OK" \
    || fail "Push feilet — prøv: git pull --rebase origin main"
fi

# ── Vercel deploy ─────────────────────────────────────────────────────────────
echo ""
info "Deployer til Vercel prod..."
if command -v vercel &>/dev/null; then
  vercel --prod --yes 2>&1 | grep -E "✓|✅|Error|Production|https://"
  ok "Vercel deploy startet"
else
  warn "vercel CLI ikke installert — git push trigget auto-deploy"
  info "Sjekk status: https://vercel.com/tom-jensens-projects/klarpakke"
fi

# ── Health checks ─────────────────────────────────────────────────────────────
echo ""
info "Venter 60s på deploy å fullføre..."
sleep 60

check() {
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$1")
  [ "$CODE" = "200" ] && ok "$2: HTTP $CODE" || warn "$2: HTTP $CODE"
}

check "https://klarpakke.no"          "Landing"
check "https://klarpakke.no/en"       "/en (ingen loop)"
check "https://klarpakke.no/api/health" "API health"

# Sjekk for /en/en redirect-loop
FINAL=$(curl -sL -o /dev/null -w "%{url_effective}" --max-time 10 "https://klarpakke.no/en")
[[ "$FINAL" == *"/en/en"* ]] \
  && fail "/en/en redirect-loop FORTSATT AKTIV → $FINAL" \
  || ok "/en redirect OK → $FINAL"

# Test referral-link format
echo ""
echo -e "${CYAN}🔗 Referral-link format (generer fra dashboard):${NC}"
echo "   https://klarpakke.no/no/innlogging?ref=GOLD-XXXX-XXXX"
echo "   https://klarpakke.no/en/innlogging?ref=GOLD-XXXX-XXXX"
echo ""

# ── Ferdig ────────────────────────────────────────────────────────────────────
echo -e "${GREEN}╔══════════════════════════════════════════╗"
echo "║  DEPLOY FERDIG                           ║"
echo -e "╚══════════════════════════════════════════╝${NC}"
echo ""
echo "Commit:  $(git log --oneline -1)"
echo "Prod:    https://klarpakke.no"
echo "Vercel:  https://vercel.com/tom-jensens-projects/klarpakke"
echo ""
echo "NESTE STEG:"
echo "  1. Gå til /no/dashboard → Referral-fane → Generer Golden Ticket"
echo "  2. Kopier lenken og test at ?ref= fanges opp ved ny signup"
echo "  3. Sjekk Supabase: referral_tracking skal få en rad etter signup"
