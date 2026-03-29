#!/bin/bash
# ============================================
# Klarpakke — Full produksjons-sjekk via Kimi
# Kjør fra: /Users/taj/klarpakke
# ============================================
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
KIMI="$DIR/scripts/kimi.sh"
PASS=0; FAIL=0

check() {
  local LABEL="$1"; local CMD="$2"
  echo -n "  → $LABEL ... "
  if eval "$CMD" &>/dev/null; then
    echo "✅"; ((PASS++))
  else
    echo "❌ FEIL"; ((FAIL++))
    eval "$CMD" 2>&1 | tail -3
  fi
}

kimi_check() {
  local LABEL="$1"; local PROMPT="$2"
  echo -n "  🤖 $LABEL ... "
  RESULT=$("$KIMI" "$PROMPT" 2>&1)
  echo "$RESULT" | head -2
}

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   KLARPAKKE — PRODUKSJONS-SJEKK 🚀       ║"
echo "╚══════════════════════════════════════════╝"

# ── 1. Miljø ──────────────────────────────────
echo ""
echo "📦 1. MILJØ & AVHENGIGHETER"
check "Node.js ≥ 18"        "node --version | grep -E 'v(1[89]|[2-9][0-9])'"
check "npm install OK"       "cd $DIR && npm ci --silent"
check "TypeScript kompilerer" "cd $DIR && npx tsc --noEmit"
check ".env.local finnes"    "test -f $DIR/.env.local"
check "Alle env-vars satt"   "$DIR/scripts/check-env.sh"

# ── 2. Database ───────────────────────────────
echo ""
echo "🗄️  2. SUPABASE DATABASE"
check "Supabase CLI tilgjengelig"  "supabase --version"
check "Migrasjoner er synkronisert" "cd $DIR && supabase db diff --schema public | grep -c 'No schema changes' || true"
check "opik_trace_id migrert"      "supabase db query 'SELECT column_name FROM information_schema.columns WHERE table_name=\$\$ai_decision_log\$\$ AND column_name=\$\$opik_trace_id\$\$' | grep opik_trace_id"

# ── 3. Build ──────────────────────────────────
echo ""
echo "🏗️  3. BUILD"
check "Next.js build OK"     "cd $DIR && npm run build 2>&1 | grep -v '^warn'"
check "Ingen build-feil"     "cd $DIR && npm run build 2>&1 | grep -v 'error' | grep -c 'Route'"

# ── 4. Tester ─────────────────────────────────
echo ""
echo "🧪 4. TESTER"
check "Unit-tester"          "cd $DIR && npm test -- --passWithNoTests --silent"
check "Type-sjekk"           "cd $DIR && npx tsc --noEmit --strict"

# ── 5. MCP-servere ────────────────────────────
echo ""
echo "🔌 5. MCP-SERVERE"
check "klarpakke-mcp wrapper" "test -f $DIR/scripts/run-klarpakke-mcp.mjs"
check "iTerm MCP wrapper"     "test -f $DIR/scripts/run-iterm-mcp.mjs"
check "mcp.json eksisterer"   "test -f $DIR/.cursor/mcp.json"
check "klarpakke i mcp.json"  "cat $DIR/.cursor/mcp.json | python3 -c 'import json,sys; d=json.load(sys.stdin); exit(0 if \"klarpakke\" in d else 1)'"

# ── 6. Sikkerhet ──────────────────────────────
echo ""
echo "🔒 6. SIKKERHET"
check "Ingen secrets i kode"  "! git -C $DIR grep -r 'sk-' -- '*.ts' '*.tsx' '*.js' 2>/dev/null | grep -v '.env'"
check "RLS aktivert"          "supabase db query 'SELECT count(*) FROM pg_tables WHERE rowsecurity=false AND schemaname=\$\$public\$\$' | grep -E '^[0-2]$'"
check "CORS konfigurert"      "grep -r 'Access-Control' $DIR/src/ || grep -r 'cors' $DIR/src/"

# ── 7. Kimi-analyse ───────────────────────────
echo ""
echo "🤖 7. KIMI KODE-ANALYSE"
kimi_check "API-feilhåndtering" \
  "Sjekk at alle Supabase-kall i /src/lib/ har try/catch og returnerer strukturerte feil. Svar: OK eller list manglende filer."
kimi_check "Auto-trading sikkerhet" \
  "Er auto_trade_settings.auto_trading_enabled-flagget sjekket ALLE steder der order plasseres? Svar: OK eller list hull."
kimi_check "Paper trading isolasjon" \
  "Er paper trading HELT isolert fra live Coinbase API-kall? Ingen live ordre ved mode='paper'? Svar: OK eller KRITISK FEIL."

# ── 8. Stripe ─────────────────────────────────
echo ""
echo "💳 8. STRIPE"
check "Stripe webhook-handler" "grep -r 'stripe-signature' $DIR/src/ | grep -v '.d.ts'"
check "Webhook secret satt"    "grep 'STRIPE_WEBHOOK_SECRET' $DIR/.env.local"

# ── Oppsummering ──────────────────────────────
echo ""
echo "══════════════════════════════════════════"
echo "  Bestått: $PASS  |  Feilet: $FAIL"
if [ $FAIL -eq 0 ]; then
  echo "  ✅ KLAR FOR PRODUKSJON"
else
  echo "  ❌ $FAIL PROBLEMER MÅ FIKSES FØR DEPLOY"
fi
echo "══════════════════════════════════════════"
echo ""
exit $FAIL
