#!/bin/bash
# MCP Full Automatisering Setup - Inkluderer Linear + Sentry
# Kjør: bash scripts/setup-mcp-automation.sh

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🔧 MCP AUTOMATISERING SETUP                                  ║"
echo "║     Inkluderer: Supabase + Linear + Sentry                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Sjekk verktøy
echo "📦 Sjekker verktøy..."

if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠️  Supabase CLI ikke funnet. Installerer...${NC}"
    brew install supabase/tap/supabase 2>/dev/null || curl -sSL https://get.supabase.com/install | sh
fi

log_success "Verktøy OK"
echo ""

# Konfigurer tokens
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 TOKEN KONFIGURASJON"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

prompt_for_token() {
    local name=$1
    local url=$2
    local current_value=$3
    
    if [ -n "$current_value" ] && [ "$current_value" != "your_${name,,}_token_here" ] && [ "$current_value" != "sbp_your_${name,,}_token_here" ]; then
        log_success "${name} token er allerede satt"
        return 0
    fi
    
    log_warning "${name} token ikke funnet"
    echo ""
    echo "1. Gå til: $url"
    echo "2. Generer ny token"
    echo "3. Kopier og lim inn her:"
    echo ""
    read -s -p "${name} Token: " token
    echo ""
    
    if [ -n "$token" ]; then
        echo "$token"
        return 0
    fi
    return 1
}

# 1. Supabase Token
SUPABASE_TOKEN=$(prompt_for_token "SUPABASE" "https://app.supabase.com/account/tokens" "${SUPABASE_ACCESS_TOKEN}")
if [ $? -eq 0 ] && [ -n "$SUPABASE_TOKEN" ]; then
    export SUPABASE_ACCESS_TOKEN="$SUPABASE_TOKEN"
    sed -i '' "s/SUPABASE_ACCESS_TOKEN=.*/SUPABASE_ACCESS_TOKEN=$SUPABASE_TOKEN/" .env.mcp.local 2>/dev/null || echo "SUPABASE_ACCESS_TOKEN=$SUPABASE_TOKEN" >> .env.mcp.local
    log_success "Supabase token lagret"
fi
echo ""

# 2. Linear Token
LINEAR_TKN=$(prompt_for_token "LINEAR" "https://linear.app/settings/api" "${LINEAR_API_KEY}")
if [ $? -eq 0 ] && [ -n "$LINEAR_TKN" ]; then
    export LINEAR_API_KEY="$LINEAR_TKN"
    sed -i '' "s/LINEAR_API_KEY=.*/LINEAR_API_KEY=$LINEAR_TKN/" .env.mcp.local 2>/dev/null || echo "LINEAR_API_KEY=$LINEAR_TKN" >> .env.mcp.local
    
    # Oppdater også .env.local for app-bruk
    if grep -q "LINEAR_API_KEY" .env.local 2>/dev/null; then
        sed -i '' "s/LINEAR_API_KEY=.*/LINEAR_API_KEY=$LINEAR_TKN/" .env.local
    else
        echo "LINEAR_API_KEY=$LINEAR_TKN" >> .env.local
    fi
    log_success "Linear token lagret"
fi
echo ""

# 3. Sentry Token
SENTRY_TKN=$(prompt_for_token "SENTRY" "https://sentry.io/settings/account/api/auth-tokens/" "${SENTRY_AUTH_TOKEN}")
if [ $? -eq 0 ] && [ -n "$SENTRY_TKN" ]; then
    export SENTRY_AUTH_TOKEN="$SENTRY_TKN"
    sed -i '' "s/SENTRY_AUTH_TOKEN=.*/SENTRY_AUTH_TOKEN=$SENTRY_TKN/" .env.mcp.local 2>/dev/null || echo "SENTRY_AUTH_TOKEN=$SENTRY_TKN" >> .env.mcp.local
    log_success "Sentry token lagret"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Oppdater MCP config filer
log_info "Oppdaterer MCP konfigurasjoner..."

# Cursor MCP
cat > .cursor/mcp.json << 'EOF'
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
    "linear": {
      "type": "http",
      "url": "https://mcp.linear.app"
    },
    "sentry": {
      "type": "http",
      "url": "https://mcp.sentry.io"
    }
  }
}
EOF

# Kimi MCP
cat > .kimi/mcp_config.json << EOF
{
  "mcpServers": {
    "klarpakke-local": {
      "command": "bash",
      "args": ["/Users/taj/klarpakke/mcp-server/mcp-wrapper.sh"]
    },
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=vuxbjlykgmzskxbclquf",
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN:-}"
      }
    },
    "linear": {
      "command": "npx",
      "args": ["-y", "@linear/mcp-server"],
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY:-}"
      }
    },
    "sentry": {
      "type": "http",
      "url": "https://mcp.sentry.io",
      "env": {
        "SENTRY_AUTH_TOKEN": "${SENTRY_AUTH_TOKEN:-}"
      }
    }
  }
}
EOF

log_success "MCP konfigurasjoner oppdatert"
echo ""

# Lagre til shell config
SHELL_RC="$HOME/.zshrc"
if [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
fi

if ! grep -q "SUPABASE_ACCESS_TOKEN" "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# MCP Tokens - Klarpakke" >> "$SHELL_RC"
    echo "export SUPABASE_ACCESS_TOKEN=\"${SUPABASE_ACCESS_TOKEN:-}\"" >> "$SHELL_RC"
    echo "export LINEAR_API_KEY=\"${LINEAR_API_KEY:-}\"" >> "$SHELL_RC"
    echo "export SENTRY_AUTH_TOKEN=\"${SENTRY_AUTH_TOKEN:-}\"" >> "$SHELL_RC"
    log_success "Tokens lagret til $SHELL_RC"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ MCP AUTOMATISERING KLAR!                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Tilkoblede MCP Servere:"
echo ""
echo "  📊 Supabase      → SQL, Edge Functions, Logs"
echo "  📋 Linear        → Issues, Projects, Teams"
echo "  🐛 Sentry        → Errors, Performance, Releases"
echo "  🔧 Klarpakke     → 170+ custom verktøy"
echo ""
echo "Bruk i Kimi CLI:"
echo "  @supabase execute_sql 'SELECT * FROM users'"
echo "  @linear create_issue"
echo "  @sentry get_errors"
echo ""
echo "Start Kimi/Cursor på nytt for å laste MCP."
echo ""
