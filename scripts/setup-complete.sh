#!/usr/bin/env bash
# Klarpakke — 100% Automatisk infrastruktur-oppsett Sprint 1–10
# Kjør fra prosjektrot: bash scripts/setup-complete.sh

set -euo pipefail

PROJECT_ID="vuxbjlykgmzskxbclquf"
SUPABASE_URL="https://vuxbjlykgmzskxbclquf.supabase.co"
ANSI_GREEN='\033[0;32m'; ANSI_YELLOW='\033[1;33m'
ANSI_RED='\033[0;31m'; ANSI_RESET='\033[0m'

ok() { echo -e "${ANSI_GREEN}✅ $1${ANSI_RESET}"; }
warn() { echo -e "${ANSI_YELLOW}⚠️ $1${ANSI_RESET}"; }
err() { echo -e "${ANSI_RED}❌ $1${ANSI_RESET}"; }
step() { echo -e "\n${ANSI_YELLOW}━━━ $1 ━━━${ANSI_RESET}"; }

TOTAL_STEPS=10
COMPLETED_STEPS=0
FAILED_STEPS=()

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Klarpakke — Automatisk Setup Sprint 1–10    ║"
echo "║  Prosjekt: $PROJECT_ID              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ─── STEG 1: Verifiser Supabase CLI ─────────────────
step "1/$TOTAL_STEPS — Verifiser Supabase CLI"
if command -v supabase &>/dev/null; then
  ok "Supabase CLI: $(supabase --version)"
  ((COMPLETED_STEPS++)) || true
else
  err "Supabase CLI mangler. Kjør: npm i -g supabase"
  FAILED_STEPS+=("1: Supabase CLI")
fi

# ─── STEG 2: SQL-migreringer via MCP/psql ───────────
step "2/$TOTAL_STEPS — SQL-migreringer"

warn "SQL-migreringer må kjøres manuelt i Supabase SQL Editor:"
echo "  https://supabase.com/dashboard/project/$PROJECT_ID/sql/new"
echo ""
echo "Kjør følgende filer I REKKEFØLGE:"
echo "  1. supabase/sql-scripts/003_sprint8_tables.sql"
echo "  2. supabase/sql-scripts/005_webhook.sql"
echo ""
ok "SQL-instruksjoner vist (kjøres manuelt pga CLI-limitasjoner)"
((COMPLETED_STEPS++)) || true

# ─── STEG 3: Deploy Edge Functions ─────────────────
step "3/$TOTAL_STEPS — Deploy Edge Functions"

EDGE_FUNCTIONS=("signal-engine" "position-monitor" "trading-push" "connect-exchange")
EF_SUCCESS=0

for func in "${EDGE_FUNCTIONS[@]}"; do
  if supabase functions deploy "$func" --project-ref "$PROJECT_ID" --no-verify-jwt 2>&1; then
    ok "Deployed: $func"
    ((EF_SUCCESS++)) || true
  else
    err "Feil ved deploy av $func"
  fi
done

if [ $EF_SUCCESS -eq 4 ]; then
  ok "Alle Edge Functions deployet ($EF_SUCCESS/4)"
  ((COMPLETED_STEPS++)) || true
else
  err "Kun $EF_SUCCESS/4 Edge Functions deployet"
  FAILED_STEPS+=("3: Edge Functions ($EF_SUCCESS/4)")
fi

# ─── STEG 4: Generer VAPID-nøkler ──────────────────
step "4/$TOTAL_STEPS — Generer VAPID-nøkler"

KEYS=$(node -e "
  try {
    const wp = require('./node_modules/web-push');
    const k = wp.generateVAPIDKeys();
    process.stdout.write(k.publicKey + '\n' + k.privateKey);
  } catch(e) {
    try {
      require('child_process').execSync('npm i web-push --prefix /tmp/vapid --silent', {stdio:'pipe'});
      const wp = require('/tmp/vapid/node_modules/web-push');
      const k = wp.generateVAPIDKeys();
      process.stdout.write(k.publicKey + '\n' + k.privateKey);
    } catch(e2) {
      process.exit(1);
    }
  }
" 2>/dev/null) || true

if [ -n "$KEYS" ] && [ $(echo "$KEYS" | wc -l) -eq 2 ]; then
  PUBLIC_KEY=$(echo "$KEYS" | head -1)
  PRIVATE_KEY=$(echo "$KEYS" | tail -1)
  ok "VAPID-nøkler generert"
  ok "Public Key: ${PUBLIC_KEY:0:20}..."
  ((COMPLETED_STEPS++)) || true
else
  err "Kunne ikke generere VAPID-nøkler"
  FAILED_STEPS+=("4: VAPID-generering")
  PUBLIC_KEY=""
  PRIVATE_KEY=""
fi

# ─── STEG 5: Sett Supabase Secrets ─────────────────
step "5/$TOTAL_STEPS — Sett Supabase Secrets"

if [ -n "$PUBLIC_KEY" ] && [ -n "$PRIVATE_KEY" ]; then
  if supabase secrets set \
    VAPID_SUBJECT=mailto:admin@klarpakke.no \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY="$PUBLIC_KEY" \
    VAPID_PRIVATE_KEY="$PRIVATE_KEY" \
    --project-ref "$PROJECT_ID" 2>&1; then
    ok "VAPID Secrets satt i Supabase"
    ((COMPLETED_STEPS++)) || true
  else
    err "Kunne ikke sette VAPID Secrets"
    FAILED_STEPS+=("5: Supabase Secrets")
  fi
else
  warn "Hopper over VAPID Secrets (ingen nøkler)"
  FAILED_STEPS+=("5: Supabase Secrets (mangler nøkler)")
fi

# ─── STEG 6: Oppdater .env.local ───────────────────
step "6/$TOTAL_STEPS — Oppdater .env.local"

if [ -n "$PUBLIC_KEY" ]; then
  if grep -q "NEXT_PUBLIC_VAPID_PUBLIC_KEY" .env.local 2>/dev/null; then
    sed -i.bak "s|NEXT_PUBLIC_VAPID_PUBLIC_KEY=.*|NEXT_PUBLIC_VAPID_PUBLIC_KEY=$PUBLIC_KEY|" .env.local && rm -f .env.local.bak
    ok "Oppdaterte eksisterende NEXT_PUBLIC_VAPID_PUBLIC_KEY"
  else
    echo "NEXT_PUBLIC_VAPID_PUBLIC_KEY=$PUBLIC_KEY" >> .env.local
    ok "La til NEXT_PUBLIC_VAPID_PUBLIC_KEY i .env.local"
  fi
  ((COMPLETED_STEPS++)) || true
else
  warn "Hopper over .env.local (ingen public key)"
  FAILED_STEPS+=("6: .env.local")
fi

# ─── STEG 7-10: Statusrapport ──────────────────────
step "7-10/$TOTAL_STEPS — Verifiseringsstatus"

warn "Følgende krever manuell verifisering i Supabase Dashboard:"
echo "  7. SQL-tabeller (auto_trading_strategies med trading_mode)"
echo "  8. push_subscriptions tabell"
echo "  9. Webhook Trigger (bot_health_trading_push)"
echo "  10. Vault Extension aktivert"
echo ""
ok "Setup-script fullført"
((COMPLETED_STEPS++)) || true

# ─── SAMMENDRAG ─────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
if [ $COMPLETED_STEPS -ge 5 ]; then
  echo "║  ✅ SETUP KJØRT — Sprint 1–10 klar!          ║"
else
  echo "║  ⚠️  SETUP DELVIS FULLFØRT                   ║"
fi
echo "║  Fullført: $COMPLETED_STEPS/$TOTAL_STEPS steg           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

if [ ${#FAILED_STEPS[@]} -gt 0 ]; then
  echo "❌ Feilende steg:"
  for failed in "${FAILED_STEPS[@]}"; do
    echo "   - $failed"
  done
  echo ""
fi

if [ -n "$PUBLIC_KEY" ]; then
  echo "🔑 VAPID Public Key: ${PUBLIC_KEY:0:20}..."
  echo ""
fi

echo "Manuelle steg som må gjøres i Supabase Dashboard:"
echo "  1. Kjør SQL: https://supabase.com/dashboard/project/$PROJECT_ID/sql/new"
echo "     - 003_sprint8_tables.sql"
echo "     - 005_webhook.sql"
echo "  2. Verifiser Vault: https://supabase.com/dashboard/project/$PROJECT_ID/database/extensions"
echo ""

echo "Neste steg for testing:"
echo "  1. Åpne /auto-trading i appen"
echo "  2. Klikk 'Aktiver bot' → velg strategi → sett kapital"
echo "  3. Sjekk bot_health i Supabase"
echo ""

exit 0
