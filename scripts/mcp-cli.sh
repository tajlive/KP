#!/bin/bash
# =============================================================================
# MCP-STYLE CLI for Klarpakke
# Enkelt grensesnitt for vanlige operasjoner
# =============================================================================

PROJECT_REF="vuxbjlykgmzskxbclquf"
TOKEN="klarpakke-dev-token"
API_URL="https://$PROJECT_REF.functions.supabase.co"

# Farger
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

show_help() {
    cat << 'EOF'
╔═══════════════════════════════════════════════════════════════╗
║     MCP-STYLE CLI for Klarpakke                               ║
╚═══════════════════════════════════════════════════════════════╝

BRUK: ./mcp-cli.sh <kommando>

KOMMANDOER:
  status        - Sjekk system status
  secrets       - List og sett secrets
  deploy        - Deploy API Gateway
  test          - Kjør full test
  logs          - Vis siste logs
  help          - Vis denne hjelpen

EKSEMPLER:
  ./mcp-cli.sh status
  ./mcp-cli.sh secrets
  ./mcp-cli.sh deploy
  ./mcp-cli.sh test

EOF
}

cmd_status() {
    echo -e "${BLUE}🔍 Sjekker system status...${NC}"
    echo ""
    
    # Test API Gateway
    echo "API Gateway:"
    RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api-gateway/health")
    if echo "$RESP" | grep -q '"status":"ok"'; then
        echo -e "  ${GREEN}✅ OK${NC}"
    else
        echo -e "  ${RED}❌ Feil${NC}"
        echo "  Respons: $RESP"
    fi
    
    # Test Taj
    echo ""
    echo "Taj Trade Engine:"
    TAJ=$(curl -s "$API_URL/taj-trade-engine" 2>/dev/null | head -1)
    if [ -n "$TAJ" ]; then
        echo -e "  ${GREEN}✅ OK${NC}"
    else
        echo -e "  ${YELLOW}⚠️  Ingen respons (kan være OK)${NC}"
    fi
    
    # Secrets
    echo ""
    echo "Secrets (lokalt):"
    echo "  API_GATEWAY_TOKEN: ${TOKEN:0:10}..."
}

cmd_secrets() {
    echo -e "${BLUE}🔐 Secrets management${NC}"
    echo ""
    
    echo "Eksisterende secrets:"
    supabase secrets list --project-ref $PROJECT_REF 2>/dev/null || echo "  Kunne ikke liste"
    
    echo ""
    echo "Sett API_GATEWAY_TOKEN:"
    supabase secrets set API_GATEWAY_TOKEN=$TOKEN --project-ref $PROJECT_REF
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Secret satt!${NC}"
    else
        echo -e "${RED}❌ Feilet${NC}"
    fi
}

cmd_deploy() {
    echo -e "${BLUE}🚀 Deployer API Gateway...${NC}"
    
    # Sjekk om funksjonen finnes
    echo "Sjekker eksisterende function..."
    
    # Deploy via CLI
    supabase functions deploy api-gateway --project-ref $PROJECT_REF
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Deploy vellykket!${NC}"
        echo ""
        echo "Tester..."
        sleep 2
        cmd_test
    else
        echo -e "${RED}❌ Deploy feilet${NC}"
        echo ""
        echo "Prøv Dashboard-metoden:"
        echo "https://supabase.com/dashboard/project/$PROJECT_REF/functions"
    fi
}

cmd_test() {
    echo -e "${BLUE}🧪 Kjører test...${NC}"
    echo ""
    
    bash "$(dirname "$0")/test-live-system.sh"
}

cmd_logs() {
    echo -e "${BLUE}📜 Siste logs for api-gateway...${NC}"
    supabase functions logs api-gateway --project-ref $PROJECT_REF
}

# Main
case "${1:-help}" in
    status)
        cmd_status
        ;;
    secrets)
        cmd_secrets
        ;;
    deploy)
        cmd_deploy
        ;;
    test)
        cmd_test
        ;;
    logs)
        cmd_logs
        ;;
    help|*)
        show_help
        ;;
esac
