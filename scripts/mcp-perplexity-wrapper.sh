#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# PERPLEXITY PRO MCP WRAPPER - AUTO TOKEN LOADING
# ═══════════════════════════════════════════════════════════════════════════
#
# Dette scriptet:
# 1. Laster inn tokens fra .env.mcp.local
# 2. Eksporterer som miljøvariabler
# 3. Starter Perplexity med MCP konfigurasjon
#
# MERK: Perplexity Pro har ikke native MCP støtte ennå.
# Dette scriptet forbereder config for når støtte kommer.
#
# Bruk: ./scripts/mcp-perplexity-wrapper.sh
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
echo "║         🔐 PERPLEXITY PRO MCP SETUP                            ║"
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

# Sjekk om Perplexity Desktop er installert
PERPLEXITY_APP=""
if [ -d "/Applications/Perplexity.app" ]; then
  PERPLEXITY_APP="/Applications/Perplexity.app"
elif [ -d "$HOME/Applications/Perplexity.app" ]; then
  PERPLEXITY_APP="$HOME/Applications/Perplexity.app"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "⚠️  VIKTIG OM PERPLEXITY PRO"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Perplexity Pro har IKKE native MCP støtte ennå (februar 2026)."
echo ""
echo "Alternativer for å bruke MCP med Perplexity:"
echo ""
echo "1. 🌐 PERPLEXITY API (Anbefalt)"
echo "   - Bruk Perplexity API direkte i din egen app"
echo "   - Kombiner med MCP for full kontroll"
echo ""
echo "2. 🔄 CLAUDE + PERPLEXITY"
echo "   - Bruk Claude Desktop med MCP"
echo "   - Spør Claude om å bruke Perplexity for research"
echo ""
echo "3. 📋 KIMI + PERPLEXITY"
echo "   - Bruk Kimi CLI med MCP"
echo "   - Integrer Perplexity API i MCP tools"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ -n "$PERPLEXITY_APP" ]; then
  echo -e "${YELLOW}Perplexity.app funnet på: $PERPLEXITY_APP${NC}"
  echo ""
  read -p "Vil du starte Perplexity? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "$PERPLEXITY_APP"
  fi
else
  echo -e "${YELLOW}Perplexity Desktop ikke funnet${NC}"
  echo "   Installér fra: https://www.perplexity.ai/download"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "For å få MCP i Perplexity, vurder å:"
echo ""
echo "  1. Stem på MCP feature request:"
echo "     https://feedback.perplexity.ai/"
echo ""
echo "  2. Bruke Claude Desktop + MCP (anbefalt):"
echo "     ./scripts/mcp-claude-wrapper.sh"
echo ""
echo "  3. Bruke Kimi CLI + MCP:"
echo "     ./scripts/mcp-kimi-wrapper.sh"
echo ""
