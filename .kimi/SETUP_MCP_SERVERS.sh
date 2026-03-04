#!/bin/bash
# KLARPAKKE - 1-CLICK MCP SERVER INSTALLER
# Kjør denne filen for å sette opp alle MCP-servere automatisk

set -e

echo "═══════════════════════════════════════════════════════════"
echo "🚀 KLARPAKKE MCP SERVER INSTALLER"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Sjekk at vi er i riktig mappe
if [ ! -f "package.json" ]; then
  echo "${RED}❌ Feil: Må kjøres fra klarpakke root-mappe${NC}"
  echo "Kjør: cd ~/klarpakke && bash .kimi/SETUP_MCP_SERVERS.sh"
  exit 1
fi

echo "${GREEN}✅ Kjører fra riktig mappe${NC}"
echo ""

# Hent Supabase connection string fra .env
if [ ! -f ".env" ]; then
  echo "${RED}❌ .env fil ikke funnet${NC}"
  exit 1
fi

echo "📋 Henter Supabase credentials fra .env..."
SUPABASE_DB_URL=$(grep SUPABASE_DB_URL .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "${RED}❌ SUPABASE_DB_URL ikke funnet i .env${NC}"
  exit 1
fi

echo "${GREEN}✅ Supabase URL hentet${NC}"
echo ""

# Sjekk om Perplexity Desktop App er installert
if [ ! -d "/Applications/Perplexity.app" ]; then
  echo "${YELLOW}⚠️ Perplexity Desktop App ikke funnet${NC}"
  echo "Last ned fra: https://www.perplexity.ai/"
  echo "Installer appen og kjør dette scriptet igjen."
  exit 1
fi

echo "${GREEN}✅ Perplexity Desktop App funnet${NC}"
echo ""

# Finn Perplexity config-mappe
PERPLEXITY_CONFIG="$HOME/Library/Application Support/Perplexity"
MCP_CONFIG="$PERPLEXITY_CONFIG/mcp_servers.json"

if [ ! -d "$PERPLEXITY_CONFIG" ]; then
  echo "${YELLOW}⚠️ Perplexity config-mappe ikke funnet${NC}"
  echo "Åpne Perplexity Desktop App én gang først."
  exit 1
fi

echo "${GREEN}✅ Perplexity config-mappe funnet${NC}"
echo ""

# Lag backup av eksisterende config
if [ -f "$MCP_CONFIG" ]; then
  BACKUP="$MCP_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
  cp "$MCP_CONFIG" "$BACKUP"
  echo "${GREEN}✅ Backup lagret: $BACKUP${NC}"
fi

echo "📝 Lager MCP server konfigurasjon..."
echo ""

# Lag MCP config
cat > "$MCP_CONFIG" << EOF
{
  "mcpServers": {
    "supabase-database": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${SUPABASE_DB_URL}"
      }
    },
    "klarpakke-codebase": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "$HOME/klarpakke"],
      "env": {}
    },
    "github-klarpakke": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "$(gh auth token 2>/dev/null || echo '')"
      }
    }
  }
}
EOF

echo "${GREEN}✅ MCP config lagret: $MCP_CONFIG${NC}"
echo ""

# Test at npm/npx er tilgjengelig
if ! command -v npx &> /dev/null; then
  echo "${RED}❌ npx ikke funnet. Installer Node.js først.${NC}"
  exit 1
fi

echo "${GREEN}✅ npx funnet${NC}"
echo ""

# Pre-installer MCP-servere (så de er klare)
echo "📦 Pre-installerer MCP-servere..."
echo "   (Dette tar 1-2 minutter første gang)"
echo ""

npx -y @modelcontextprotocol/server-postgres --version &>/dev/null &
PID1=$!

npx -y @modelcontextprotocol/server-filesystem --version &>/dev/null &
PID2=$!

npx -y @modelcontextprotocol/server-github --version &>/dev/null &
PID3=$!

# Vent på at alle er ferdige
wait $PID1 $PID2 $PID3

echo "${GREEN}✅ MCP-servere pre-installert${NC}"
echo ""

# Restart Perplexity (hvis den kjører)
if pgrep -x "Perplexity" > /dev/null; then
  echo "🔄 Restarter Perplexity..."
  osascript -e 'quit app "Perplexity"'
  sleep 2
  open -a Perplexity
  echo "${GREEN}✅ Perplexity restartet${NC}"
else
  echo "${YELLOW}⚠️ Perplexity kjører ikke. Start den manuelt.${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "${GREEN}🎉 MCP-SERVERE INSTALLERT!${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Installerte servere:"
echo "  ✅ supabase-database    (PostgreSQL access til Supabase)"
echo "  ✅ klarpakke-codebase   (Lokal file system access)"
echo "  ✅ github-klarpakke     (GitHub API access)"
echo ""
echo "Neste steg:"
echo "1. Åpne Perplexity Desktop App"
echo "2. Gå til Space: 'Lansering Klarpakke'"
echo "3. Under chat-vinduet, klikk 'Sources' (nederst)"
echo "4. Aktiver:"
echo "   ☑️ supabase-database"
echo "   ☑️ klarpakke-codebase"
echo "   ☑️ github-klarpakke"
echo "5. Test: 'Vis alle tabeller i databasen'"
echo ""
echo "Config-fil: $MCP_CONFIG"
echo "Backup: $BACKUP"
echo ""
echo "═══════════════════════════════════════════════════════════"
