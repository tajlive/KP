#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# KIMI CLI MCP WRAPPER - AUTO TOKEN LOADING
# ═══════════════════════════════════════════════════════════════════════════
#
# Dette scriptet:
# 1. Laster inn tokens fra .env.mcp.local
# 2. Eksporterer som miljøvariabler
# 3. Starter Kimi CLI med MCP konfigurasjon
#
# Bruk: alias kimi='~/klarpakke/scripts/mcp-kimi-wrapper.sh'
# ═══════════════════════════════════════════════════════════════════════════

# Farger
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Finn prosjekt root (uansett hvor scriptet kalles fra)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Last inn tokens
echo -e "${BLUE}🔐 Laster MCP tokens...${NC}"
if [ -f "$PROJECT_ROOT/.env.mcp.local" ]; then
  set -a
  source "$PROJECT_ROOT/.env.mcp.local"
  set +a
  echo -e "${GREEN}✅ Tokens lastet${NC}"
else
  echo -e "${YELLOW}⚠️  .env.mcp.local ikke funnet${NC}"
  echo "   Kjør: ./scripts/setup-mcp-auth.sh"
fi

# Sjekk at tokens er satt
if [ -z "$SUPABASE_ACCESS_TOKEN" ] || [ "$SUPABASE_ACCESS_TOKEN" = "sbp_your_supabase_token_here" ]; then
  echo -e "${YELLOW}⚠️  SUPABASE_ACCESS_TOKEN ikke satt${NC}"
fi

# Sett KIMI_MCP_CONFIG for å bruke vår config
export KIMI_MCP_CONFIG="$PROJECT_ROOT/.kimi/mcp_config.json"

echo -e "${BLUE}🚀 Starter Kimi CLI med MCP...${NC}"
echo ""

# Kjør Kimi med alle argumentene som ble sendt til dette scriptet
# Bruk 'which kimi' for å finne ekte kimi executable
KIMI_BIN=$(which kimi 2>/dev/null || echo "kimi")
exec "$KIMI_BIN" "$@"
