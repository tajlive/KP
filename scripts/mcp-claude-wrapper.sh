#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# CLAUDE DESKTOP MCP WRAPPER - AUTO TOKEN LOADING
# ═══════════════════════════════════════════════════════════════════════════
#
# Dette scriptet:
# 1. Laster inn tokens fra .env.mcp.local
# 2. Eksporterer som miljøvariabler
# 3. Starter Claude Desktop med MCP konfigurasjon
#
# Bruk: ./scripts/mcp-claude-wrapper.sh
# ═══════════════════════════════════════════════════════════════════════════

# Farger
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Finn prosjekt root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         🔐 CLAUDE DESKTOP MCP LAUNCHER                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Last inn tokens
echo -e "${BLUE}📂 Laster tokens fra .env.mcp.local...${NC}"
if [ -f "$PROJECT_ROOT/.env.mcp.local" ]; then
  set -a
  source "$PROJECT_ROOT/.env.mcp.local"
  set +a
  echo -e "${GREEN}✅ Tokens lastet${NC}"
else
  echo -e "${RED}❌ .env.mcp.local ikke funnet${NC}"
  echo "   Kjør: ./scripts/setup-mcp-auth.sh"
  exit 1
fi

# Sjekk at tokens er satt
MISSING=0
if [ -z "$SUPABASE_ACCESS_TOKEN" ] || [ "$SUPABASE_ACCESS_TOKEN" = "sbp_your_supabase_token_here" ]; then
  echo -e "${RED}❌ SUPABASE_ACCESS_TOKEN ikke satt${NC}"
  MISSING=1
fi

if [ -z "$VERCEL_TOKEN" ] || [ "$VERCEL_TOKEN" = "your_vercel_token_here" ]; then
  echo -e "${RED}❌ VERCEL_TOKEN ikke satt${NC}"
  MISSING=1
fi

if [ $MISSING -eq 1 ]; then
  echo ""
  echo "Kjør: ./scripts/setup-mcp-auth.sh"
  exit 1
fi

# Kopier config til Claude Desktop
CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
mkdir -p "$CLAUDE_CONFIG_DIR"

echo -e "${BLUE}📝 Oppdaterer Claude Desktop config...${NC}"
cp "$PROJECT_ROOT/.claude/claude_desktop_config.json" "$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
echo -e "${GREEN}✅ Config kopiert${NC}"

echo ""
echo -e "${GREEN}🚀 Starter Claude Desktop...${NC}"
echo ""

# Start Claude Desktop
if [ -d "/Applications/Claude.app" ]; then
  open "/Applications/Claude.app"
elif [ -d "$HOME/Applications/Claude.app" ]; then
  open "$HOME/Applications/Claude.app"
else
  echo -e "${YELLOW}⚠️  Fant ikke Claude.app${NC}"
  echo "   Start Claude Desktop manuelt"
fi

echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "✅ Claude Desktop starter nå med MCP autentisering!"
echo ""
echo "Verifiser:"
echo "  1. Åpne Claude Desktop"
echo "  2. Se etter MCP tools i verktøy-menyen"
echo "  3. Prøv: 'List alle tabeller i Supabase'"
echo ""
