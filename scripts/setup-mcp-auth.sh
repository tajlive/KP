#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# MCP AUTENTISERING SETUP
# ═══════════════════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         🔐 MCP AUTENTISERING SETUP                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Sjekk at vi er i riktig directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Feil: Kjør dette scriptet fra klarpakke rot-mappe${NC}"
  exit 1
fi

# Kopier template hvis .env.mcp.local ikke finnes
if [ ! -f ".env.mcp.local" ]; then
  echo -e "${BLUE}📋 Kopierer template til .env.mcp.local...${NC}"
  cp .env.mcp .env.mcp.local
  echo -e "${GREEN}✅ .env.mcp.local opprettet${NC}"
else
  echo -e "${YELLOW}⚠️  .env.mcp.local finnes allerede${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📝 STEG 1: CLOUDFLARE API TOKEN"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "1. Åpne: ${BLUE}https://dash.cloudflare.com/profile/api-tokens${NC}"
echo "2. Klikk: ${GREEN}Create Token${NC}"
echo "3. Velg:  ${YELLOW}Edit Cloudflare Workers${NC} (eller en tilpasset token med Workers-edit + Zone-read)"
echo "4. Kopier token og kjør:"
echo ""
echo "   ${BLUE}export CLOUDFLARE_API_TOKEN='din-token-her'${NC}"
echo "   ${BLUE}echo \"CLOUDFLARE_API_TOKEN=\$CLOUDFLARE_API_TOKEN\" >> .env.mcp.local${NC}"
echo ""

# Sjekk om token allerede finnes
if grep -q "CLOUDFLARE_API_TOKEN=your_" .env.mcp.local 2>/dev/null || ! grep -q "CLOUDFLARE_API_TOKEN=" .env.mcp.local 2>/dev/null; then
  echo -e "${YELLOW}⚠️  CLOUDFLARE_API_TOKEN mangler i .env.mcp.local${NC}"
else
  echo -e "${GREEN}✅ CLOUDFLARE_API_TOKEN funnet${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📝 STEG 2: SUPABASE TOKEN"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "1. Åpne: ${BLUE}https://supabase.com/dashboard/account/tokens${NC}"
echo "2. Klikk: ${GREEN}Generate new token${NC}"
echo "3. Navn:  ${YELLOW}Klarpakke MCP${NC}"
echo "4. Kopier token og kjør:"
echo ""
echo "   ${BLUE}export SUPABASE_ACCESS_TOKEN='din-token-her'${NC}"
echo "   ${BLUE}echo \"SUPABASE_ACCESS_TOKEN=\$SUPABASE_ACCESS_TOKEN\" >> .env.mcp.local${NC}"
echo ""

# Sjekk om token allerede finnes
if grep -q "SUPABASE_ACCESS_TOKEN=your_" .env.mcp.local 2>/dev/null || ! grep -q "SUPABASE_ACCESS_TOKEN=" .env.mcp.local 2>/dev/null; then
  echo -e "${YELLOW}⚠️  SUPABASE_ACCESS_TOKEN mangler i .env.mcp.local${NC}"
else
  echo -e "${GREEN}✅ SUPABASE_ACCESS_TOKEN funnet${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📝 STEG 3: AKTIVÉR MCP CONFIG"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Velg én av følgende alternativer:"
echo ""
echo "${BLUE}ALTERNATIV A - Cursor (anbefalt):${NC}"
echo "  cp .cursor/mcp-authenticated.json .cursor/mcp.json"
echo ""
echo "${BLUE}ALTERNATIV B - Claude Desktop:${NC}"
echo "  mkdir -p ~/Library/Application\ Support/Claude"
echo "  cp .cursor/mcp-authenticated.json ~/Library/Application\\ Support/Claude/claude_desktop_config.json"
echo ""
echo "${BLUE}ALTERNATIV C - Kimi CLI:${NC}"
echo "  mkdir -p ~/.config/kimi"
echo "  cp .cursor/mcp-authenticated.json ~/.config/kimi/mcp_config.json"
echo ""

# Sjekk om mcp.json allerede er satt opp
if [ -f ".cursor/mcp.json" ]; then
  if grep -q "supabase-secure" .cursor/mcp.json 2>/dev/null; then
    echo -e "${GREEN}✅ .cursor/mcp.json er allerede konfigurert med autentisering${NC}"
  else
    echo -e "${YELLOW}⚠️  .cursor/mcp.json finnes men mangler autentisering${NC}"
    echo "   Kjør: cp .cursor/mcp-authenticated.json .cursor/mcp.json"
  fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🔧 STEG 4: LAST INN TOKENS (MANUELT)"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Før du bruker MCP, last inn tokens:"
echo ""
echo "   ${BLUE}source .env.mcp.local${NC}"
echo ""

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ SETUP STATUS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Sjekk status
CLOUDFLARE_OK=false
SUPABASE_OK=false

if [ -f ".env.mcp.local" ]; then
  if ! grep -q "CLOUDFLARE_API_TOKEN=your_" .env.mcp.local 2>/dev/null && grep -q "CLOUDFLARE_API_TOKEN=" .env.mcp.local 2>/dev/null; then
    CLOUDFLARE_OK=true
  fi
  if ! grep -q "SUPABASE_ACCESS_TOKEN=your_" .env.mcp.local 2>/dev/null && grep -q "SUPABASE_ACCESS_TOKEN=" .env.mcp.local 2>/dev/null; then
    SUPABASE_OK=true
  fi
fi

if [ "$CLOUDFLARE_OK" = true ] && [ "$SUPABASE_OK" = true ]; then
  echo -e "${GREEN}🎉 Alt er konfigurert!${NC}"
  echo ""
  echo "Neste steg:"
  echo "  1. Last inn tokens: source .env.mcp.local"
  echo "  2. Kopier config: cp .cursor/mcp-authenticated.json .cursor/mcp.json"
  echo "  3. Start Cursor og bruk MCP uten login-prompts!"
else
  echo -e "${YELLOW}⚠️  Setup ikke fullført${NC}"
  echo ""
  if [ "$CLOUDFLARE_OK" = false ]; then
    echo -e "   ${RED}❌ CLOUDFLARE_API_TOKEN mangler${NC}"
  fi
  if [ "$SUPABASE_OK" = false ]; then
    echo -e "   ${RED}❌ SUPABASE_ACCESS_TOKEN mangler${NC}"
  fi
  echo ""
  echo "Følg instruksjonene ovenfor for å generere tokens."
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
