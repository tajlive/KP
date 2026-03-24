#!/usr/bin/env bash
# =============================================================================
# verify-automation.sh — Samlet verifikasjon av MCP/CLI/API/CI
# =============================================================================
# Kjør: npm run verify:automation
# Validerer: lint, type-check, unit-tester, prod-verify, MCP-tilkoblinger (valgfritt).
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SKIP_MCP="${SKIP_MCP:-false}"
FAILED=0

run() {
  local name=$1
  local cmd=$2
  echo ""
  echo -e "${BLUE}▶ $name${NC}"
  if eval "$cmd"; then
    echo -e "${GREEN}✅ $name OK${NC}"
    return 0
  else
    echo -e "${RED}❌ $name FEILET${NC}"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

echo "══════════════════════════════════════════════════════════════"
echo "  KLARPAKKE AUTOMASJONSVERIFIKASJON (MCP/CLI/API/CI)"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "══════════════════════════════════════════════════════════════"

run "MCP config (.cursor ↔ .mcp)" "npm run mcp:validate-config" || true
run "Lint" "npm run lint" || true
run "Type-check" "npm run type-check" || true
run "Unit-tester" "npm run test:unit" || true
run "Prod-verify (domener, health, paths)" "npm run verify" || true

if [[ "$SKIP_MCP" != "true" ]] && [[ -f "scripts/test-mcp-connections.sh" ]]; then
  echo ""
  echo -e "${BLUE}▶ MCP-tilkoblinger (Supabase, Stripe, Vercel, …)${NC}"
  if bash scripts/test-mcp-connections.sh 2>/dev/null; then
    echo -e "${GREEN}✅ MCP-tilkoblinger OK${NC}"
  else
    echo -e "${YELLOW}⚠️  MCP-sjekk feilet eller manglende secrets — fortsetter (ikke blokkering)${NC}"
  fi
else
  echo ""
  echo -e "${YELLOW}⏭️  MCP-sjekk hoppet over (SKIP_MCP=$SKIP_MCP)${NC}"
fi

echo ""
echo "══════════════════════════════════════════════════════════════"
if [[ $FAILED -gt 0 ]]; then
  echo -e "${RED}❌ $FAILED sjekk(er) feilet${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Alle kritiske sjekker bestått${NC}"
  exit 0
fi
