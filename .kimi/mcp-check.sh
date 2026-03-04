#!/bin/bash
# KIMI 2.5 MCP Auto-Check Hook
# Dette scriptet sjekker om MCP-verktøy er tilgjengelig

KIMI_MCP_STATUS_FILE="/tmp/kimi_mcp_status"

check_mcp_available() {
    # Sjekk om MCP .env finnes og har tokens
    if [ -f "klarpakke-mcp-server/.env" ]; then
        local has_supabase=$(grep -E "SUPABASE_(URL|SERVICE_ROLE_KEY)" klarpakke-mcp-server/.env | wc -l)
        local has_vercel=$(grep "VERCEL_TOKEN" klarpakke-mcp-server/.env | grep -v "din_token" | wc -l)
        local has_github=$(grep "GITHUB_PAT" klarpakke-mcp-server/.env | wc -l)
        
        if [ "$has_supabase" -ge 2 ] && [ "$has_vercel" -ge 1 ] && [ "$has_github" -ge 1 ]; then
            echo "available" > "$KIMI_MCP_STATUS_FILE"
            return 0
        fi
    fi
    
    echo "unavailable" > "$KIMI_MCP_STATUS_FILE"
    return 1
}

get_mcp_status() {
    if [ -f "$KIMI_MCP_STATUS_FILE" ]; then
        cat "$KIMI_MCP_STATUS_FILE"
    else
        check_mcp_available
        cat "$KIMI_MCP_STATUS_FILE"
    fi
}

# Main
if [ "$1" == "check" ]; then
    if check_mcp_available; then
        echo "✅ MCP verktøy er tilgjengelig!"
        echo ""
        echo "Tilgjengelige verktøy:"
        echo "  - Database SQL (psql)"
        echo "  - Vercel deploy"
        echo "  - GitHub Actions"
        echo "  - Supabase admin"
        echo ""
        echo "Bruk: ./scripts/mcp.sh [kommando]"
    else
        echo "⚠️  MCP verktøy er IKKE tilgjengelig"
        echo ""
        echo "Mangler konfigurasjon i klarpakke-mcp-server/.env:"
        echo "  - SUPABASE_URL"
        echo "  - SUPABASE_SERVICE_ROLE_KEY"
        echo "  - VERCEL_TOKEN"
        echo "  - GITHUB_PAT"
        echo ""
        echo "Fremgangsmåte:"
        echo "1. cd klarpakke-mcp-server"
        echo "2. cp .env.example .env"
        echo "3. Fyll inn tokens"
    fi
fi
