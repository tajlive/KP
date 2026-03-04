#!/bin/bash
# Linear API Key Auto-Detection
# Prøver å finne API-nøkkelen automatisk

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "🔍 Søker etter Linear API-nøkkel..."
echo ""

found_key=""
found_source=""

# Sjekk miljøvariabel
if [ -n "$LINEAR_API_KEY" ]; then
  found_key="$LINEAR_API_KEY"
  found_source="Miljøvariabel (LINEAR_API_KEY)"
fi

# Sjekk .env.local
if [ -z "$found_key" ] && [ -f ".env.local" ]; then
  key=$(grep "LINEAR_API_KEY" .env.local 2>/dev/null | grep -v "^#" | cut -d'=' -f2)
  if [ -n "$key" ]; then
    found_key="$key"
    found_source=".env.local"
  fi
fi

# Sjekk .env
if [ -z "$found_key" ] && [ -f ".env" ]; then
  key=$(grep "LINEAR_API_KEY" .env 2>/dev/null | grep -v "^#" | cut -d'=' -f2)
  if [ -n "$key" ]; then
    found_key="$key"
    found_source=".env"
  fi
fi

# Sjekk .env.mcp.local
if [ -z "$found_key" ] && [ -f ".env.mcp.local" ]; then
  key=$(grep "LINEAR_API_KEY" .env.mcp.local 2>/dev/null | grep -v "^#" | cut -d'=' -f2)
  if [ -n "$key" ]; then
    found_key="$key"
    found_source=".env.mcp.local"
  fi
fi

# Sjekk shell config
if [ -z "$found_key" ]; then
  for file in ~/.zshrc ~/.bashrc ~/.bash_profile; do
    if [ -f "$file" ]; then
      key=$(grep "export LINEAR_API_KEY" "$file" 2>/dev/null | cut -d'=' -f2 | tr -d '"')
      if [ -n "$key" ]; then
        found_key="$key"
        found_source="$file"
        break
      fi
    fi
  done
fi

# Vis resultat
if [ -n "$found_key" ]; then
  echo -e "${GREEN}✅ API-nøkkel funnet!${NC}"
  echo "  Kilde: ${BLUE}$found_source${NC}"
  echo "  Nøkkel: ${found_key:0:20}..."
  echo ""
  echo "For å eksportere:"
  echo "  export LINEAR_API_KEY=\"$found_key\""
  exit 0
else
  echo -e "${RED}❌ Ingen API-nøkkel funnet${NC}"
  echo ""
  echo "Kjør setup for å opprette:"
  echo "  bash scripts/setup-linear-auto.sh"
  exit 1
fi
