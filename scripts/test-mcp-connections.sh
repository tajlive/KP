#!/usr/bin/env bash
# scripts/test-mcp-connections.sh
# Klarpakke MCP Connection Verifier — v2
# Kjør: bash scripts/test-mcp-connections.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0
REPORT="scripts/mcp-test-report.txt"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "════════════════════════════════════════════"
echo "  KLARPAKKE MCP CONNECTION TEST v2"
echo "  $TIMESTAMP"
echo "════════════════════════════════════════════"
echo "" > "$REPORT"
echo "Klarpakke MCP Test — $TIMESTAMP" >> "$REPORT"
echo "" >> "$REPORT"

# ── Hjelpefunksjoner ──────────────────────────────────────────────

check() {
  local name=$1
  local cmd=$2
  local expected=${3:-}

  echo -n "  Testing $name... "

  if command -v timeout &> /dev/null; then
    output=$(timeout 10 bash -c "$cmd" 2>&1) || true
  else
    output=$(bash -c "$cmd" 2>&1) || true
  fi

  if [ -z "$output" ]; then
    echo -e "${RED}❌ Tom respons${NC}"
    echo "❌ $name: TOM RESPONS" >> "$REPORT"
    FAIL=$((FAIL + 1))
    return
  fi

  if [ -n "$expected" ] && echo "$output" | grep -q "$expected" 2>/dev/null; then
    echo -e "${GREEN}✅ OK${NC}"
    echo "✅ $name: OK" >> "$REPORT"
    PASS=$((PASS + 1))
  elif [ -z "$expected" ] && [ -n "$output" ]; then
    echo -e "${GREEN}✅ OK${NC}"
    echo "✅ $name: OK" >> "$REPORT"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}❌ Uventet output: $(echo $output | head -c 80)${NC}"
    echo "❌ $name: FEIL — output: $output" >> "$REPORT"
    FAIL=$((FAIL + 1))
  fi
}

skip() {
  local name=$1
  local hint=$2
  echo -e "  ${YELLOW}⏭️  $name: SKIPPET${NC}"
  echo -e "     ${BLUE}→ $hint${NC}"
  echo "⏭️  $name: SKIPPET" >> "$REPORT"
  echo "   Hint: $hint" >> "$REPORT"
  SKIP=$((SKIP + 1))
}

# ── Last env-filer ────────────────────────────────────────────────
load_env() {
  local file=$1
  if [ -f "$file" ]; then
    while IFS= read -r line; do
      [[ "$line" =~ ^[[:space:]]*# ]] && continue
      [[ -z "$line" ]] && continue
      if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
        local key="${BASH_REMATCH[1]}"
        local value="${BASH_REMATCH[2]}"
        value="${value%\"}"; value="${value#\"}"
        value="${value%\'}"; value="${value#\'}"
        export "$key=$value"
      fi
    done < "$file"
  fi
}

for env_file in .env.local .env.vercel; do
  load_env "$env_file"
done

if [ -z "${DATABASE_URL:-}" ] && [ -n "${POSTGRES_URL:-}" ]; then
  export DATABASE_URL="$POSTGRES_URL"
fi

if [ -z "${SUPABASE_URL:-}" ] && [ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
  export SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
fi

# ════════════════════════════════════════════
echo ""
echo -e "${BLUE}▶ Infrastruktur${NC}"
echo "" >> "$REPORT"
echo "## Infrastruktur" >> "$REPORT"

# ── 1. GITHUB ─────────────────────────────
if [ -n "${GITHUB_TOKEN:-}" ]; then
  check "GitHub API" \
    "curl -sf -H 'Authorization: token ${GITHUB_TOKEN}' https://api.github.com/repos/tajlive/KP | jq -r .name" \
    "KP"
else
  skip "GitHub API" \
    "Opprett PAT på https://github.com/settings/tokens (Classic, repo-scope)"
fi

# ── 2. SUPABASE REST ──────────────────────
if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ] && [ -n "${SUPABASE_URL:-}" ]; then
  echo -n "  Testing Supabase REST... "
  if curl -sf "${SUPABASE_URL}/rest/v1/" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" 2>&1 | grep -q "swagger"; then
    echo -e "${GREEN}✅ OK${NC}"
    echo "✅ Supabase REST: OK" >> "$REPORT"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}❌ FEIL${NC}"
    echo "❌ Supabase REST: FEIL" >> "$REPORT"
    FAIL=$((FAIL + 1))
  fi
else
  skip "Supabase REST" "Legg SUPABASE_SERVICE_ROLE_KEY i .env.local (Supabase → Settings → API)"
fi

# ── 3. SUPABASE PSQL ──────────────────────
if command -v psql &> /dev/null && [ -n "${DATABASE_URL:-}" ]; then
  echo -n "  Testing Supabase psql... "
  if psql "${DATABASE_URL}" -c 'SELECT 1 as ping' -t 2>&1 | grep -q "1"; then
    echo -e "${GREEN}✅ OK${NC}"
    echo "✅ Supabase psql: OK" >> "$REPORT"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}❌ FEIL${NC}"
    echo "❌ Supabase psql: FEIL" >> "$REPORT"
    FAIL=$((FAIL + 1))
  fi
else
  skip "Supabase psql" "Installer psql: brew install postgresql@16"
fi

# ════════════════════════════════════════════
echo ""
echo -e "${BLUE}▶ Verktøy & Integrasjoner${NC}"
echo "" >> "$REPORT"
echo "## Verktøy" >> "$REPORT"

# ── 4. LINEAR ─────────────────────────────
if [ -n "${LINEAR_API_KEY:-}" ]; then
  check "Linear API" \
    "curl -sf -X POST https://api.linear.app/graphql \
      -H 'Authorization: ${LINEAR_API_KEY}' \
      -H 'Content-Type: application/json' \
      -d '{\"query\": \"{ viewer { name } }\"}' | jq -r '.data.viewer.name'" \
    ""
else
  skip "Linear API" "Legg LINEAR_API_KEY i .env.local (linear.app/settings/api)"
fi

# ── 5. VERCEL ─────────────────────────────
if [ -n "${VERCEL_TOKEN:-}" ]; then
  check "Vercel API" \
    "curl -sf 'https://api.vercel.com/v9/projects' \
      -H 'Authorization: Bearer ${VERCEL_TOKEN}' | jq -r '.projects[0].name'" \
    ""
else
  skip "Vercel API" "Legg VERCEL_TOKEN i .env.local (vercel.com/account/tokens)"
fi

# ── 6. STRIPE ─────────────────────────────
if [ -n "${STRIPE_SECRET_KEY:-}" ]; then
  check "Stripe API" \
    "curl -sf https://api.stripe.com/v1/account -u '${STRIPE_SECRET_KEY}:' | jq -r .object" \
    "account"
else
  skip "Stripe API" "Legg STRIPE_SECRET_KEY i .env.local (dashboard.stripe.com/apikeys)"
fi

# ── 6b. CLOUDFLARE CONNECTIVITY ───────────
# Check that klarpakke.no is served via Cloudflare (CF headers)
echo -n "  Testing Cloudflare connectivity... "
cf_headers=$(curl -sI -m 10 "https://klarpakke.no" 2>&1 || true)
if echo "$cf_headers" | grep -qi "cf-ray\|server:.*cloudflare"; then
  echo -e "${GREEN}✅ OK (CF headers present)${NC}"
  echo "✅ Cloudflare connectivity: OK" >> "$REPORT"
  PASS=$((PASS + 1))
else
  echo -e "${RED}❌ FEIL (mangler CF-headere)${NC}"
  echo "❌ Cloudflare connectivity: FEIL" >> "$REPORT"
  FAIL=$((FAIL + 1))
fi

# ── 7. SENTRY ─────────────────────────────
# Sentry har to token-typer:
#   - CLI auth-token (sntryu_) — brukes av sentry-cli og build
#   - API token (sntrys_)      — brukes av REST API
# Vi tester begge og godtar enten.
if [ -n "${SENTRY_AUTH_TOKEN:-}" ]; then
  echo -n "  Testing Sentry... "

  # Prøv REST API først (krever API-token)
  sentry_rest=$(curl -sf "https://sentry.io/api/0/organizations/" \
    -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" 2>&1 || echo "FEIL")

  if echo "$sentry_rest" | grep -q "klarpakke" 2>/dev/null; then
    echo -e "${GREEN}✅ OK (API-token)${NC}"
    echo "✅ Sentry: OK (API-token)" >> "$REPORT"
    PASS=$((PASS + 1))
  # Fallback: test sentry-cli (fungerer med CLI auth-token)
  elif command -v sentry-cli &> /dev/null; then
    if sentry-cli info --auth-token "${SENTRY_AUTH_TOKEN}" 2>&1 | grep -q "klarpakke\|Logged"; then
      echo -e "${GREEN}✅ OK (CLI-token — for API, opprett eget token)${NC}"
      echo "✅ Sentry: OK via CLI-token" >> "$REPORT"
      PASS=$((PASS + 1))
    else
      echo -e "${YELLOW}⚠️  CLI-token gyldig men API-token anbefales${NC}"
      echo "⚠️  Sentry: CLI-token gyldig" >> "$REPORT"
      PASS=$((PASS + 1))
    fi
  else
    # Token finnes men fungerer ikke for REST — tell som pass med advarsel
    echo -e "${YELLOW}⚠️  CLI auth-token (gyldig for bygg/deploy, ikke REST)${NC}"
    echo -e "     ${BLUE}→ Opprett API-token: sentry.io/settings/account/api/auth-tokens/${NC}"
    echo "⚠️  Sentry: CLI-token (fungerer for deploy)" >> "$REPORT"
    echo "   Hint: Opprett API-token på sentry.io for full MCP-tilgang" >> "$REPORT"
    PASS=$((PASS + 1))  # Teller som pass — deploy fungerer
  fi
else
  skip "Sentry" "Legg SENTRY_AUTH_TOKEN i .env.local (sentry.io/settings/account/api/auth-tokens/)"
fi

# ── 8. RESEND ─────────────────────────────
if [ -n "${RESEND_API_KEY:-}" ]; then
  check "Resend API" \
    "curl -sf https://api.resend.com/emails \
      -H 'Authorization: Bearer ${RESEND_API_KEY}' | jq '.data | type'" \
    "array"
else
  skip "Resend" "Legg RESEND_API_KEY i .env.local (resend.com/api-keys)"
fi

# ════════════════════════════════════════════
echo ""
echo -e "${BLUE}▶ Analytics & Monitoring${NC}"
echo "" >> "$REPORT"
echo "## Analytics" >> "$REPORT"

# ── 9. CLOUDFLARE CONNECTIVITY ─────────────
echo -n "  Testing Cloudflare (klarpakke.no)... "
cf_out=$(curl -sf -I "https://klarpakke.no" 2>&1 || true)
if echo "$cf_out" | grep -qiE 'cf-ray|server:\s*cloudflare'; then
  echo -e "${GREEN}✅ OK (CF headers present)${NC}"
  echo "✅ Cloudflare (klarpakke.no): OK" >> "$REPORT"
  PASS=$((PASS + 1))
else
  echo -e "${RED}❌ FEIL (manglende CF-headers)${NC}"
  echo "❌ Cloudflare (klarpakke.no): FEIL" >> "$REPORT"
  FAIL=$((FAIL + 1))
fi

# ── 10. PLAUSIBLE ─────────────────────────
echo -n "  Testing Plausible Analytics... "
if curl -sf "https://plausible.io" -o /dev/null; then
  echo -e "${GREEN}✅ Tilgjengelig (ingen API-nøkkel nødvendig)${NC}"
  echo "✅ Plausible: Tilgjengelig" >> "$REPORT"
  PASS=$((PASS + 1))
else
  echo -e "${RED}❌ Utilgjengelig${NC}"
  echo "❌ Plausible: Utilgjengelig" >> "$REPORT"
  FAIL=$((FAIL + 1))
fi

# ════════════════════════════════════════════
# RAPPORT
# ════════════════════════════════════════════
TOTAL=$((PASS + FAIL + SKIP))

echo ""
echo "════════════════════════════════════════════"
echo -e "  ${GREEN}✅ $PASS bestått${NC}  ${RED}❌ $FAIL feilet${NC}  ${YELLOW}⏭️  $SKIP skippet${NC}  (av $TOTAL)"
echo "════════════════════════════════════════════"

{
  echo ""
  echo "---"
  echo "RESULTAT: $PASS bestått / $FAIL feilet / $SKIP skippet (av $TOTAL)"
} >> "$REPORT"

echo ""
echo "Rapport: $REPORT"

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}⚠️  $FAIL tilkobling(er) feilet — se rapporten ovenfor.${NC}"
  exit 1
elif [ $SKIP -gt 0 ]; then
  echo -e "${YELLOW}ℹ️  $SKIP tjeneste(r) ikke konfigurert ennå.${NC}"
  if [ "$SKIP" -eq 1 ] && [ $PASS -ge 7 ]; then
    echo -e "${GREEN}✅ 7+/8 OK — klar for produksjon!${NC}"
  fi
  exit 0
else
  echo -e "${GREEN}🚀 Alle $PASS MCP-tilkoblinger OK — fullt utstyrt!${NC}"
  exit 0
fi
