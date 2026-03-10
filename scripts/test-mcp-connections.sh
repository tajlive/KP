#!/usr/bin/env bash
# scripts/test-mcp-connections.sh
# Klarpakke MCP Connection Verifier
# Kjør: bash scripts/test-mcp-connections.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
REPORT="scripts/mcp-test-report.txt"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "════════════════════════════════════════"
echo "  KLARPAKKE MCP CONNECTION TEST"
echo "  $TIMESTAMP"
echo "════════════════════════════════════════"
echo "" > "$REPORT"

check() {
  local name=$1
  local cmd=$2
  local expected=${3:-}
  local timeout_sec=${4:-10}
  
  echo -n "Testing $name... "
  
  if output=$(timeout "$timeout_sec" bash -c "$cmd" 2>&1); then
    if [ -n "$expected" ] && echo "$output" | grep -q "$expected" 2>/dev/null; then
      echo -e "${GREEN}✅ OK${NC}"
      echo "✅ $name: OK" >> "$REPORT"
      ((PASS++))
    elif [ -z "$expected" ]; then
      # Ingen expected = bare sjekk at kommandoen kjørte
      echo -e "${GREEN}✅ OK${NC}"
      echo "✅ $name: OK" >> "$REPORT"
      ((PASS++))
    else
      echo -e "${RED}❌ FEIL (uventet output)${NC}"
      echo "❌ $name: FEIL - fikk: $output" >> "$REPORT"
      ((FAIL++))
    fi
  else
    echo -e "${RED}❌ FEIL (kommando feilet)${NC}"
    echo "❌ $name: KOMMANDO FEILET" >> "$REPORT"
    ((FAIL++))
  fi
}

# Les .env.local hvis finnes
if [ -f .env.local ]; then
  export $(grep -E '^(GITHUB|SUPABASE|DATABASE|LINEAR|VERCEL|STRIPE|SENTRY|RESEND)' .env.local | xargs) 2>/dev/null || true
fi

# ── 1. GITHUB ─────────────────────────────
if [ -n "${GITHUB_TOKEN:-}" ]; then
  check "GitHub API" \
    "curl -sf -H \"Authorization: token \$GITHUB_TOKEN\" https://api.github.com/repos/tajlive/KP | jq -r .name" \
    "KP"
else
  echo -e "${YELLOW}⚠️  GitHub: Ingen token (GITHUB_TOKEN mangler)${NC}"
  echo "⏭️  GitHub: SKIPPET" >> "$REPORT"
fi

# ── 2. SUPABASE REST ──────────────────────
if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ] && [ -n "${SUPABASE_URL:-}" ]; then
  check "Supabase REST" \
    "curl -sf -H \"apikey: \$SUPABASE_SERVICE_ROLE_KEY\" -H \"Authorization: Bearer \$SUPABASE_SERVICE_ROLE_KEY\" '\$SUPABASE_URL/rest/v1/user_profiles?limit=1' | jq '. | length'" \
    ""
else
  echo -e "${YELLOW}⚠️  Supabase REST: Ingen nøkkel (SUPABASE_SERVICE_ROLE_KEY eller SUPABASE_URL mangler)${NC}"
  echo "⏭️  Supabase REST: SKIPPET" >> "$REPORT"
fi

# ── 3. SUPABASE PSQL ──────────────────────
if command -v psql &> /dev/null && [ -n "${DATABASE_URL:-}" ]; then
  check "Supabase psql" \
    "psql '\$DATABASE_URL' -c 'SELECT 1 as ping' -t 2>&1 | grep -o '1' | head -1" \
    "1"
else
  echo -e "${YELLOW}⚠️  Supabase psql: psql ikke installert eller DATABASE_URL mangler${NC}"
  echo "⏭️  Supabase psql: SKIPPET" >> "$REPORT"
fi

# ── 4. LINEAR ─────────────────────────────
if [ -n "${LINEAR_API_KEY:-}" ]; then
  check "Linear API" \
    "curl -sf -X POST https://api.linear.app/graphql -H 'Authorization: \$LINEAR_API_KEY' -H 'Content-Type: application/json' -d '{\"query\": \"{ viewer { name } }\"}' | jq -r '.data.viewer.name'" \
    ""
else
  echo -e "${YELLOW}⚠️  Linear: Ingen token (LINEAR_API_KEY mangler)${NC}"
  echo "⏭️  Linear: SKIPPET" >> "$REPORT"
fi

# ── 5. VERCEL ─────────────────────────────
if [ -n "${VERCEL_TOKEN:-}" ]; then
  check "Vercel API" \
    "curl -sf https://api.vercel.com/v9/projects -H 'Authorization: Bearer \$VERCEL_TOKEN' | jq '.projects[] | select(.name==\"klarpakke\") | .name'" \
    "klarpakke"
else
  echo -e "${YELLOW}⚠️  Vercel: Ingen token (VERCEL_TOKEN mangler)${NC}"
  echo "⏭️  Vercel: SKIPPET" >> "$REPORT"
fi

# ── 6. STRIPE ─────────────────────────────
if [ -n "${STRIPE_SECRET_KEY:-}" ]; then
  check "Stripe API" \
    "curl -sf https://api.stripe.com/v1/account -u '\$STRIPE_SECRET_KEY:' | jq -r .object" \
    "account"
else
  echo -e "${YELLOW}⚠️  Stripe: Ingen nøkkel (STRIPE_SECRET_KEY mangler)${NC}"
  echo "⏭️  Stripe: SKIPPET" >> "$REPORT"
fi

# ── 7. SENTRY ─────────────────────────────
if [ -n "${SENTRY_AUTH_TOKEN:-}" ]; then
  check "Sentry API" \
    "curl -sf 'https://sentry.io/api/0/projects/klarpakke/klarpakke/' -H 'Authorization: Bearer \$SENTRY_AUTH_TOKEN' | jq -r .slug" \
    "klarpakke"
else
  echo -e "${YELLOW}⚠️  Sentry: Ingen token (SENTRY_AUTH_TOKEN mangler)${NC}"
  echo "⏭️  Sentry: SKIPPET" >> "$REPORT"
fi

# ── 8. RESEND ─────────────────────────────
if [ -n "${RESEND_API_KEY:-}" ]; then
  check "Resend API" \
    "curl -sf https://api.resend.com/emails -H 'Authorization: Bearer \$RESEND_API_KEY' | jq '.data | type'" \
    "array"
else
  echo -e "${YELLOW}⚠️  Resend: Ingen nøkkel (RESEND_API_KEY mangler)${NC}"
  echo "⏭️  Resend: SKIPPET" >> "$REPORT"
fi

# ── RAPPORT ───────────────────────────────
echo ""
echo "════════════════════════════════════════"
echo -e "  RESULTAT: ${GREEN}$PASS bestått${NC} / ${RED}$FAIL feilet${NC}"
echo "════════════════════════════════════════"
echo ""
echo "Full rapport lagret: $REPORT"

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}⚠️  $FAIL MCP-tilkobling(er) feilet!${NC}"
  echo "Sjekk .env.local for manglende nøkler."
  exit 1
else
  echo -e "${GREEN}✅ Alle MCP-tilkoblinger OK — klar for produksjon!${NC}"
  exit 0
fi
