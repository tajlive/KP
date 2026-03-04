#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# MCP WRAPPER MED AUTENTISERING
# ═══════════════════════════════════════════════════════════════════════════
# 
# Dette scriptet:
# 1. Laster inn tokens fra .env.mcp.local
# 2. Eksporterer som miljøvariabler
# 3. Starter MCP server
#
# Bruk: ./scripts/mcp-with-auth.sh [cursor|claude|kimi]
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Farger
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Sjekk at vi er i riktig directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Feil: Kjør dette scriptet fra klarpakke rot-mappe${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}🔐 MCP Autentisering Wrapper${NC}"
echo ""

# Last inn tokens hvis de finnes
if [ -f ".env.mcp.local" ]; then
  echo -e "${BLUE}📂 Laster tokens fra .env.mcp.local...${NC}"
  set -a
  source .env.mcp.local
  set +a
  echo -e "${GREEN}✅ Tokens lastet${NC}"
else
  echo -e "${YELLOW}⚠️  .env.mcp.local ikke funnet${NC}"
  echo "   Kjør: ./scripts/setup-mcp-auth.sh"
  exit 1
fi

# Sjekk at tokens er satt
if [ -z "$VERCEL_TOKEN" ] || [ "$VERCEL_TOKEN" = "your_vercel_token_here" ]; then
  echo -e "${RED}❌ VERCEL_TOKEN ikke satt${NC}"
  echo "   Kjør: ./scripts/setup-mcp-auth.sh"
  exit 1
fi

if [ -z "$SUPABASE_ACCESS_TOKEN" ] || [ "$SUPABASE_ACCESS_TOKEN" = "sbp_your_supabase_token_here" ]; then
  echo -e "${RED}❌ SUPABASE_ACCESS_TOKEN ikke satt${NC}"
  echo "   Kjør: ./scripts/setup-mcp-auth.sh"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Alle tokens klare!${NC}"
echo ""

# Håndter valg
EDITOR=${1:-cursor}

case $EDITOR in
  cursor)
    echo -e "${BLUE}🖥️  Starter Cursor MCP med autentisering...${NC}"
    if [ -f ".cursor/mcp-authenticated.json" ]; then
      cp .cursor/mcp-authenticated.json .cursor/mcp.json
      echo -e "${GREEN}✅ .cursor/mcp.json oppdatert${NC}"
      echo ""
      echo "Start nå Cursor - MCP serverne vil ha full autentisering!"
    else
      echo -e "${RED}❌ .cursor/mcp-authenticated.json ikke funnet${NC}"
      exit 1
    fi
    ;;
  
  claude)
    echo -e "${BLUE}🖥️  Setter opp Claude Desktop MCP...${NC}"
    CONFIG_DIR="$HOME/Library/Application Support/Claude"
    mkdir -p "$CONFIG_DIR"
    
    # Sjekk om config finnes
    if [ -f "$CONFIG_DIR/claude_desktop_config.json" ]; then
      echo -e "${YELLOW}⚠️  Claude config finnes allerede${NC}"
      echo "   Backup: $CONFIG_DIR/claude_desktop_config.json.backup"
      cp "$CONFIG_DIR/claude_desktop_config.json" "$CONFIG_DIR/claude_desktop_config.json.backup"
    fi
    
    cp .cursor/mcp-authenticated.json "$CONFIG_DIR/claude_desktop_config.json"
    echo -e "${GREEN}✅ Claude Desktop config oppdatert${NC}"
    echo "   Config: $CONFIG_DIR/claude_desktop_config.json"
    ;;
  
  kimi)
    echo -e "${BLUE}🖥️  Setter opp Kimi CLI MCP...${NC}"
    CONFIG_DIR="$HOME/.config/kimi"
    mkdir -p "$CONFIG_DIR"
    
    cp .cursor/mcp-authenticated.json "$CONFIG_DIR/mcp_config.json"
    echo -e "${GREEN}✅ Kimi CLI config oppdatert${NC}"
    echo "   Config: $CONFIG_DIR/mcp_config.json"
    ;;
  
  *)
    echo -e "${RED}❌ Ukjent editor: $EDITOR${NC}"
    echo "   Bruk: cursor, claude, eller kimi"
    exit 1
    ;;
esac

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}🎉 MCP med autentisering er klar!${NC}"
echo ""
echo "Verifiser at det fungerer:"
echo "  1. Åpne din editor ($EDITOR)"
echo "  2. Start MCP servers"
echo "  3. Prøv: 'List alle tabeller i Supabase'"
echo "  4. Prøv: 'Deploy til Vercel'"
echo ""
echo "Ingen OAuth-prompts skal vises!"
echo ""
