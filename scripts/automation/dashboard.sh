#!/bin/bash
# Klarpakke Automation Dashboard
# Kjør: bash scripts/automation/dashboard.sh

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

show_header() {
    clear
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║           🚀 KlarPakke Automation Dashboard                        ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo ""
}

show_status() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 System Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Git status
    if git rev-parse --git-dir > /dev/null 2>&1; then
        BRANCH=$(git branch --show-current)
        COMMITS=$(git rev-list --count HEAD)
        echo -e "  ${CYAN}Git:${NC} $BRANCH (${COMMITS} commits)"
        
        UNCOMMITTED=$(git status --porcelain | wc -l)
        if [ $UNCOMMITTED -gt 0 ]; then
            echo -e "  ${YELLOW}⚠️  $UNCOMMITTED uncommitted changes${NC}"
        else
            echo -e "  ${GREEN}✅ Clean working tree${NC}"
        fi
    fi
    
    # Node dependencies
    if [ -d "node_modules" ]; then
        DEPS=$(ls node_modules | wc -l)
        echo -e "  ${CYAN}Dependencies:${NC} ~$DEPS packages"
    fi
    
    # Siste deploy
    if [ -f ".vercel/project.json" ]; then
        echo -e "  ${CYAN}Vercel:${NC} Connected"
    fi
    
    echo ""
}

show_menu() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔧 Hovedmeny"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  ${CYAN}1)${NC} Setup & Installasjon"
    echo "     • Full dev setup"
    echo "     • Setup MCP tokens"
    echo "     • Setup Git hooks"
    echo ""
    echo "  ${CYAN}2)${NC} Development"
    echo "     • Kjør dev server"
    echo "     • Kjør tester"
    echo "     • Lint & format"
    echo ""
    echo "  ${CYAN}3)${NC} Database"
    echo "     • Kjør migrasjoner"
    echo "     • Backup database"
    echo "     • Seed testdata"
    echo ""
    echo "  ${CYAN}4)${NC} Deploy"
    echo "     • Deploy preview"
    echo "     • Deploy production"
    echo "     • Deploy Edge Functions"
    echo ""
    echo "  ${CYAN}5)${NC} Monitoring"
    echo "     • Se logs"
    echo "     • Health check"
    echo "     • Sentry errors"
    echo ""
    echo "  ${CYAN}6)${NC} AI & Automatisering"
    echo "     • AI code review"
    echo "     • AI commit"
    echo "     • Generer changelog"
    echo ""
    echo "  ${CYAN}7)${NC} Security"
    echo "     • Security scan"
    echo "     • Secrets check"
    echo "     • Dependency audit"
    echo ""
    echo "  ${CYAN}8)${NC} Full Pipeline"
    echo "     • QA + Test + Deploy"
    echo ""
    echo "  ${CYAN}q)${NC} Quit"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

handle_choice() {
    case $1 in
        1)
            echo ""
            echo "${CYAN}Setup & Installasjon${NC}"
            echo ""
            echo "1) Full dev setup"
            echo "2) Setup MCP"
            echo "3) Setup Git hooks"
            echo "4) Tilbake"
            read -p "Velg: " setup_choice
            case $setup_choice in
                1) bash scripts/automation/dev-setup.sh ;;
                2) bash scripts/setup-mcp-automation.sh ;;
                3) bash scripts/automation/setup-git-hooks.sh ;;
            esac
            ;;
        2)
            echo ""
            echo "${CYAN}Development${NC}"
            echo ""
            echo "1) Kjør dev server (npm run dev)"
            echo "2) Kjør tester"
            echo "3) Lint & fix"
            echo "4) Format code"
            echo "5) Tilbake"
            read -p "Velg: " dev_choice
            case $dev_choice in
                1) npm run dev ;;
                2) npm test ;;
                3) npm run lint -- --fix ;;
                4) npx prettier --write "src/**/*.{ts,tsx}" ;;
            esac
            ;;
        3)
            echo ""
            echo "${CYAN}Database${NC}"
            echo ""
            echo "1) Kjør migrasjoner"
            echo "2) Backup database"
            echo "3) Reset lokal DB"
            echo "4) Tilbake"
            read -p "Velg: " db_choice
            case $db_choice in
                1) supabase db push ;;
                2) bash scripts/automation/db-backup.sh ;;
                3) supabase db reset ;;
            esac
            ;;
        4)
            echo ""
            echo "${CYAN}Deploy${NC}"
            echo ""
            echo "1) Deploy preview"
            echo "2) Deploy production"
            echo "3) Deploy Edge Functions"
            echo "4) Full auto-deploy"
            echo "5) Tilbake"
            read -p "Velg: " deploy_choice
            case $deploy_choice in
                1) npx vercel ;;
                2) npx vercel --prod ;;
                3) supabase functions deploy ;;
                4) bash scripts/mcp-auto-deploy.sh ;;
            esac
            ;;
        5)
            echo ""
            echo "${CYAN}Monitoring${NC}"
            echo ""
            echo "1) Vercel logs"
            echo "2) Edge Function logs"
            echo "3) Health check"
            echo "4) Sentry"
            echo "5) Tilbake"
            read -p "Velg: " mon_choice
            case $mon_choice in
                1) npx vercel logs ;;
                2) supabase functions logs ;;
                3) curl -s https://www.klarpakke.no/api/health | jq . ;;
                4) open https://sentry.io/organizations/klarpakke/issues/ ;;
            esac
            ;;
        6)
            echo ""
            echo "${CYAN}AI & Automatisering${NC}"
            echo ""
            echo "1) AI code review"
            echo "2) AI commit"
            echo "3) Generer changelog"
            echo "4) Status sjekk"
            echo "5) Tilbake"
            read -p "Velg: " ai_choice
            case $ai_choice in
                1) bash scripts/automation/ai-code-review.sh ;;
                2) bash scripts/automation/ai-commit.sh ;;
                3) bash scripts/automation/generate-changelog.sh ;;
                4) bash scripts/mcp-status.sh ;;
            esac
            ;;
        7)
            echo ""
            echo "${CYAN}Security${NC}"
            echo ""
            echo "1) Full security scan"
            echo "2) Secrets check"
            echo "3) NPM audit"
            echo "4) Tilbake"
            read -p "Velg: " sec_choice
            case $sec_choice in
                1) bash scripts/automation/security-scan.sh ;;
                2) gitleaks detect --source . ;;
                3) npm audit ;;
            esac
            ;;
        8)
            echo ""
            echo "${CYAN}Full Pipeline${NC}"
            echo "Kjører: QA → Test → Build → Deploy"
            echo ""
            read -p "Fortsett? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                make -f Makefile.automation ship-it
            fi
            ;;
        q|Q)
            echo ""
            echo -e "${GREEN}Ha en fin dag! 👋${NC}"
            echo ""
            exit 0
            ;;
    esac
}

# Main loop
while true; do
    show_header
    show_status
    show_menu
    
    read -p "Velg alternativ (1-8, q): " choice
    handle_choice $choice
    
    echo ""
    read -p "Trykk Enter for å fortsette..."
done
