#!/bin/bash
# Automatisk Linear API Setup
# Kjør: bash scripts/setup-linear-auto.sh

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           📋 Linear API Auto-Setup                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${CYAN}▶ $1${NC}"; }

# Sjekk om Linear CLI er installert
check_linear_cli() {
  if command -v lin &> /dev/null; then
    log_success "Linear CLI funnet"
    return 0
  else
    log_warning "Linear CLI ikke funnet"
    return 1
  fi
}

# Installer Linear CLI
install_linear_cli() {
  log_step "Installerer Linear CLI..."
  npm install -g @linear/cli
  log_success "Linear CLI installert"
}

# Sjekk eksisterende API key
check_existing_key() {
  if [ -n "$LINEAR_API_KEY" ]; then
    log_info "LINEAR_API_KEY er allerede satt"
    echo "   Nøkkel: ${LINEAR_API_KEY:0:20}..."
    return 0
  fi
  
  # Sjekk .env.local
  if [ -f ".env.local" ] && grep -q "LINEAR_API_KEY" .env.local; then
    log_info "Fant LINEAR_API_KEY i .env.local"
    return 0
  fi
  
  return 1
}

# Guide brukeren gjennom API key opprettelse
guide_api_key_creation() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log_step "Steg 1: Opprett Linear API-nøkkel"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "1. Gå til: ${CYAN}https://linear.app/settings/api${NC}"
  echo "2. Klikk: ${CYAN}"New API key"${NC}"
  echo "3. Gi navn: ${CYAN}"Klarpakke MCP"${NC}"
  echo "4. Kopier nøkkelen (starter med ${CYAN}lin_api_${NC})"
  echo ""
  
  # Åpne browser automatisk hvis mulig
  if command -v open &> /dev/null; then
    read -p "Åpne Linear i browser? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      open "https://linear.app/settings/api"
    fi
  fi
  
  echo ""
  read -s -p "Lim inn API-nøkkelen din: " api_key
  echo
  
  if [ -z "$api_key" ]; then
    log_error "Ingen nøkkel oppgitt"
    exit 1
  fi
  
  # Valider at den ser riktig ut
  if [[ ! $api_key =~ ^lin_api_ ]]; then
    log_warning "Nøkkelen ser ikke ut som en Linear API-nøkkel"
    log_info "Forventet format: lin_api_xxxxx"
    read -p "Vil du fortsette likevel? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
  
  export LINEAR_API_KEY="$api_key"
}

# Lagre API key
save_api_key() {
  log_step "Lagrer API-nøkkel..."
  
  # Lagre til .env.local
  if [ -f ".env.local" ]; then
    if grep -q "LINEAR_API_KEY" .env.local; then
      # Oppdater eksisterende
      sed -i '' "s/LINEAR_API_KEY=.*/LINEAR_API_KEY=$LINEAR_API_KEY/" .env.local
    else
      # Legg til ny
      echo "LINEAR_API_KEY=$LINEAR_API_KEY" >> .env.local
    fi
  else
    echo "LINEAR_API_KEY=$LINEAR_API_KEY" > .env.local
  fi
  
  # Lagre til .env.mcp.local
  if [ -f ".env.mcp.local" ]; then
    if grep -q "LINEAR_API_KEY" .env.mcp.local; then
      sed -i '' "s/LINEAR_API_KEY=.*/LINEAR_API_KEY=$LINEAR_API_KEY/" .env.mcp.local
    else
      echo "LINEAR_API_KEY=$LINEAR_API_KEY" >> .env.mcp.local
    fi
  fi
  
  log_success "API-nøkkel lagret"
}

# Test tilkobling
test_connection() {
  log_step "Tester tilkobling til Linear..."
  
  local response=$(curl -s -X POST https://api.linear.app/graphql \
    -H "Authorization: $LINEAR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"query": "{ viewer { name email } }"}' 2>&1)
  
  if echo "$response" | grep -q "errors"; then
    log_error "Tilkobling feilet"
    echo "Respons: $response"
    return 1
  fi
  
  if echo "$response" | grep -q "viewer"; then
    local name=$(echo "$response" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
    local email=$(echo "$response" | grep -o '"email":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    log_success "Tilkobling vellykket!"
    echo ""
    echo "  👤 Bruker: ${CYAN}$name${NC}"
    echo "  📧 Email: ${CYAN}$email${NC}"
    return 0
  fi
  
  log_error "Uventet respons fra API"
  echo "Respons: $response"
  return 1
}

# Hent og vis teams
fetch_teams() {
  log_step "Henter teams..."
  
  local response=$(curl -s -X POST https://api.linear.app/graphql \
    -H "Authorization: $LINEAR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"query": "{ teams { nodes { id name key } } }"}' 2>&1)
  
  if echo "$response" | grep -q "teams"; then
    log_success "Teams hentet:"
    echo "$response" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | while read team; do
      echo "  • $team"
    done
  fi
}

# Hent og vis issues
fetch_issues() {
  log_step "Henter issues..."
  
  local response=$(curl -s -X POST https://api.linear.app/graphql \
    -H "Authorization: $LINEAR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"query": "{ issues(first: 5) { nodes { identifier title state { name } } } }"}' 2>&1)
  
  if echo "$response" | grep -q "issues"; then
    log_success "Siste 5 issues:"
    echo "$response" | grep -o '"identifier":"[^"]*".*"title":"[^"]*"' | while read line; do
      local id=$(echo "$line" | grep -o '"identifier":"[^"]*"' | cut -d'"' -f4)
      local title=$(echo "$line" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
      echo "  • ${CYAN}$id${NC}: $title"
    done
  fi
}

# Oppdater MCP config
update_mcp_config() {
  log_step "Oppdaterer MCP konfigurasjon..."
  
  # Oppdater .cursor/mcp.json
  if [ -f ".cursor/mcp.json" ]; then
    cat > .cursor/mcp.json << EOF
{
  "mcpServers": {
    "klarpakke-local": {
      "command": "bash",
      "args": ["/Users/taj/klarpakke/mcp-server/mcp-wrapper.sh"]
    },
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=vuxbjlykgmzskxbclquf"
    },
    "vercel": {
      "type": "http",
      "url": "https://mcp.vercel.com/tom-jensens-projects/klarpakke"
    },
    "linear": {
      "command": "npx",
      "args": ["-y", "@linear/mcp-server"],
      "env": {
        "LINEAR_API_KEY": "$LINEAR_API_KEY"
      }
    },
    "sentry": {
      "type": "http",
      "url": "https://mcp.sentry.io"
    }
  }
}
EOF
    log_success ".cursor/mcp.json oppdatert"
  fi
  
  # Oppdater .kimi/mcp_config.json
  if [ -f ".kimi/mcp_config.json" ]; then
    cat > .kimi/mcp_config.json << EOF
{
  "mcpServers": {
    "klarpakke-local": {
      "command": "bash",
      "args": ["/Users/taj/klarpakke/mcp-server/mcp-wrapper.sh"]
    },
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=vuxbjlykgmzskxbclquf"
    },
    "vercel": {
      "type": "http",
      "url": "https://mcp.vercel.com/tom-jensens-projects/klarpakke"
    },
    "linear": {
      "command": "npx",
      "args": ["-y", "@linear/mcp-server"],
      "env": {
        "LINEAR_API_KEY": "$LINEAR_API_KEY"
      }
    },
    "sentry": {
      "type": "http",
      "url": "https://mcp.sentry.io"
    }
  }
}
EOF
    log_success ".kimi/mcp_config.json oppdatert"
  fi
}

# Hovedflyt
main() {
  # Sjekk Linear CLI
  if ! check_linear_cli; then
    install_linear_cli
  fi
  
  # Sjekk eksisterende key
  if ! check_existing_key; then
    guide_api_key_creation
    save_api_key
  fi
  
  # Test tilkobling
  if test_connection; then
    fetch_teams
    fetch_issues
    update_mcp_config
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║           ✅ Linear Setup Fullført!                           ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Nå kan du bruke:"
    echo ""
    echo "  ${CYAN}Linear CLI:${NC}"
    echo "    lin me"
    echo "    lin issue list"
    echo ""
    echo "  ${CYAN}MCP (Kimi/Cursor):${NC}"
    echo "    @linear list_issues"
    echo "    @linear create_issue"
    echo ""
    echo "  ${CYAN}API:${NC}"
    echo "    curl /api/linear/me"
    echo "    curl /api/linear/issues"
    echo ""
    log_info "Restart Kimi/Cursor for å aktivere MCP"
  else
    log_error "Setup feilet - sjekk API-nøkkelen"
    exit 1
  fi
}

main
