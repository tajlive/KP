#!/bin/bash
# MCP Status Checker - Viser status for alle MCP servere
# Kjør: bash scripts/mcp-status.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           🔌 MCP SERVER STATUS                               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Funksjon for å sjekke token
check_token() {
    local name=$1
    local var_name=$2
    local value=${!var_name}
    
    if [ -n "$value" ] && [ "$value" != "your_${name,,}_token_here" ] && [ "$value" != "sbp_your_${name,,}_token_here" ]; then
        echo -e "  ${GREEN}✅${NC} $name: ${GREEN}Satt${NC} (${value:0:15}...)"
        return 0
    else
        echo -e "  ${RED}❌${NC} $name: ${RED}Mangler${NC}"
        echo -e "     ${CYAN}→${NC} Hent på: $3"
        return 1
    fi
}

# Funksjon for å sjekke MCP config
check_mcp_config() {
    local file=$1
    local name=$2
    
    if [ -f "$file" ]; then
        if grep -q "$name" "$file" 2>/dev/null; then
            echo -e "    ${GREEN}✓${NC} $name"
            return 0
        else
            echo -e "    ${RED}✗${NC} $name (mangler)"
            return 1
        fi
    else
        echo -e "    ${RED}✗${NC} Config fil ikke funnet"
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 TOKENS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Last inn .env.mcp.local hvis den finnes
if [ -f .env.mcp.local ]; then
    export $(grep -v '^#' .env.mcp.local | xargs 2>/dev/null)
fi

check_token "Supabase" "SUPABASE_ACCESS_TOKEN" "https://app.supabase.com/account/tokens"
check_token "Vercel" "VERCEL_TOKEN" "https://vercel.com/account/tokens"
check_token "Linear" "LINEAR_API_KEY" "https://linear.app/settings/api"
check_token "Sentry" "SENTRY_AUTH_TOKEN" "https://sentry.io/settings/account/api/auth-tokens/"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 MCP KONFIGURASJON"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "${BLUE}Cursor (.cursor/mcp.json):${NC}"
if [ -f .cursor/mcp.json ]; then
    check_mcp_config .cursor/mcp.json "supabase"
    check_mcp_config .cursor/mcp.json "vercel"
    check_mcp_config .cursor/mcp.json "linear"
    check_mcp_config .cursor/mcp.json "sentry"
else
    echo -e "  ${RED}❌${NC} Fil ikke funnet"
fi

echo ""
echo "${BLUE}Kimi (.kimi/mcp_config.json):${NC}"
if [ -f .kimi/mcp_config.json ]; then
    check_mcp_config .kimi/mcp_config.json "supabase"
    check_mcp_config .kimi/mcp_config.json "vercel"
    check_mcp_config .kimi/mcp_config.json "linear"
    check_mcp_config .kimi/mcp_config.json "sentry"
else
    echo -e "  ${RED}❌${NC} Fil ikke funnet"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛠️  VERKTØY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_tool() {
    if command -v $1 &> /dev/null; then
        local version=$($1 --version 2>/dev/null | head -1)
        echo -e "  ${GREEN}✅${NC} $1: ${CYAN}$version${NC}"
    else
        echo -e "  ${RED}❌${NC} $1: Ikke installert"
    fi
}

check_tool "supabase"
check_tool "vercel"
check_tool "node"
check_tool "git"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 AUTOMATISERINGSSCRIPTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

scripts=(
    "setup-mcp-automation.sh:Setup tokens & config"
    "mcp-auto-deploy.sh:Full CI/CD pipeline"
    "mcp-sql-executor.py:SQL executor"
    "mcp-status.sh:Denne statussjekken"
)

for script_info in "${scripts[@]}"; do
    IFS=':' read -r script desc <<< "$script_info"
    if [ -f "scripts/$script" ]; then
        echo -e "  ${GREEN}✅${NC} $script"
        echo -e "     ${CYAN}→${NC} $desc"
    else
        echo -e "  ${RED}❌${NC} $script (mangler)"
    fi
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Bruk i Kimi CLI:"
echo ""
echo "  @supabase list_tables          # List databasetabeller"
echo "  @vercel create_deployment      # Deploy til Vercel"
echo "  @linear create_issue           # Opprett Linear issue"
echo "  @sentry get_errors             # Hent Sentry feil"
echo ""
echo "🎯 Rask kommando:"
echo "  bash scripts/setup-mcp-automation.sh"
echo ""
