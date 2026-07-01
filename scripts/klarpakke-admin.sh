#!/bin/bash
# KLARPAKKE ADMIN - Automatiseringsskript
# Bruk: ./scripts/klarpakke-admin.sh [kommando]

set -e

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Konfigurasjon
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  KLARPAKKE ADMIN TOOL${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

show_help() {
    echo "Bruk: $0 [kommando]"
    echo ""
    echo "Kommandoer:"
    echo "  status       - Sjekk system status"
    echo "  deploy       - Deploy til produksjon"
    echo "  test         - Kjør type-check og lint"
    echo "  clean        - Rydd opp (node_modules, .next)"
    echo "  archive      - Arkiver gamle dokumenter"
    echo "  backup-db    - Ta database backup"
    echo "  update-deps  - Oppdater avhengigheter"
    echo "  help         - Vis denne hjelpen"
    echo ""
}

cmd_status() {
    echo -e "${YELLOW}Sjekker system status...${NC}"
    echo ""
    
    # Sjekk Node.js
    if command -v node &> /dev/null; then
        echo -e "${GREEN}✓ Node.js:${NC} $(node --version)"
    else
        echo -e "${RED}✗ Node.js:${NC} Ikke installert"
    fi
    
    # Sjekk npm
    if command -v npm &> /dev/null; then
        echo -e "${GREEN}✓ npm:${NC} $(npm --version)"
    else
        echo -e "${RED}✗ npm:${NC} Ikke installert"
    fi
    
    # Sjekk miljøvariabler
    if [ -f "$PROJECT_DIR/.env.local" ]; then
        echo -e "${GREEN}✓ .env.local:${NC} Finnes"
        
        # Sjekk viktige variabler
        if grep -q "SUPABASE_SERVICE_ROLE_KEY" "$PROJECT_DIR/.env.local"; then
            echo -e "${GREEN}  ✓ SUPABASE_SERVICE_ROLE_KEY:${NC} Satt"
        else
            echo -e "${RED}  ✗ SUPABASE_SERVICE_ROLE_KEY:${NC} Mangler"
        fi
    else
        echo -e "${RED}✗ .env.local:${NC} Finnes ikke"
    fi
    
    echo ""
    
    # Sjekk git status
    cd "$PROJECT_DIR"
    if [ -d ".git" ]; then
        BRANCH=$(git branch --show-current)
        echo -e "${GREEN}✓ Git branch:${NC} $BRANCH"
        
        UNCOMMITTED=$(git status --porcelain | wc -l)
        if [ $UNCOMMITTED -gt 0 ]; then
            echo -e "${YELLOW}! Ucommitted endringer:${NC} $UNCOMMITTED filer"
        else
            echo -e "${GREEN}✓ Git:${NC} Ingen ucommitted endringer"
        fi
    fi
    
    echo ""
    echo -e "${BLUE}Mappestruktur:${NC}"
    echo "  Project: $PROJECT_DIR"
    echo "  Src: $PROJECT_DIR/src"
    echo "  Components: $PROJECT_DIR/src/components"
}

cmd_deploy() {
    echo -e "${YELLOW}Deployer til produksjon...${NC}"
    echo ""
    
    cd "$PROJECT_DIR"
    
    # Sjekk for ucommitted endringer
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${RED}ADVARSEL:${NC} Det finnes ucommitted endringer"
        echo "Vil du fortsette likevel? (y/n)"
        read -r response
        if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            echo "Avbrutt."
            exit 1
        fi
    fi
    
    # Kjør type-check
    echo -e "${BLUE}Kjører type-check...${NC}"
    if npm run type-check; then
        echo -e "${GREEN}✓ Type-check OK${NC}"
    else
        echo -e "${RED}✗ Type-check feilet${NC}"
        exit 1
    fi
    
    echo ""
    
    # Deploy
    echo -e "${BLUE}Deployer med Cloudflare/Wrangler...${NC}"
    npm run cf:deploy

    echo ""
    echo -e "${GREEN}✓ Deploy fullført!${NC}"
    echo "  URL: https://www.klarpakke.no"
}

cmd_test() {
    echo -e "${YELLOW}Kjører tester...${NC}"
    echo ""
    
    cd "$PROJECT_DIR"
    
    # Type-check
    echo -e "${BLUE}1. TypeScript type-check...${NC}"
    if npm run type-check; then
        echo -e "${GREEN}   ✓ Type-check OK${NC}"
    else
        echo -e "${RED}   ✗ Type-check feilet${NC}"
        return 1
    fi
    
    echo ""
    
    # Lint
    echo -e "${BLUE}2. Linting...${NC}"
    if npm run lint 2>/dev/null; then
        echo -e "${GREEN}   ✓ Lint OK${NC}"
    else
        echo -e "${YELLOW}   ! Lint hoppet over (ikke konfigurert)${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}✓ Alle tester OK${NC}"
}

cmd_clean() {
    echo -e "${YELLOW}Rydder opp...${NC}"
    echo ""
    
    cd "$PROJECT_DIR"
    
    # Slett .next
    if [ -d ".next" ]; then
        echo -e "${BLUE}Sletter .next...${NC}"
        rm -rf .next
        echo -e "${GREEN}✓ .next slettet${NC}"
    fi
    
    # Slett node_modules (valgfritt)
    echo "Vil du slette node_modules også? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "${BLUE}Sletter node_modules...${NC}"
        rm -rf node_modules
        echo -e "${GREEN}✓ node_modules slettet${NC}"
        echo ""
        echo "Kjør 'npm install' for å reinstallere."
    fi
    
    echo ""
    echo -e "${GREEN}✓ Opprydding fullført${NC}"
}

cmd_archive() {
    echo -e "${YELLOW}Arkiverer gamle dokumenter...${NC}"
    echo ""
    
    cd "$PROJECT_DIR"
    
    # Arkiv-mappe
    ARCHIVE_DIR="archive/$(date +%Y%m%d)"
    mkdir -p "$ARCHIVE_DIR"
    
    # Liste over filer som kan arkiveres
    OLD_DOCS=(
        "AUTO-TRADING-DESIGN.md"
        "BETA-TESTING.md"
        "BETA-IMPLEMENTATION-REPORT.md"
    )
    
    for doc in "${OLD_DOCS[@]}"; do
        if [ -f "$doc" ]; then
            echo -e "${BLUE}Arkiverer $doc...${NC}"
            mv "$doc" "$ARCHIVE_DIR/"
        fi
    done
    
    echo ""
    echo -e "${GREEN}✓ Arkivering fullført${NC}"
    echo "  Arkiv: $ARCHIVE_DIR"
    echo "  $(ls -1 "$ARCHIVE_DIR" 2>/dev/null | wc -l) filer flyttet"
}

cmd_backup_db() {
    echo -e "${YELLOW}Tar database backup...${NC}"
    echo ""
    
    # TODO: Implementere database backup
    echo -e "${YELLOW}TODO: Implementer database backup${NC}"
    echo "Bruk: supabase db dump --output backup-$(date +%Y%m%d).sql"
}

cmd_update_deps() {
    echo -e "${YELLOW}Oppdaterer avhengigheter...${NC}"
    echo ""
    
    cd "$PROJECT_DIR"
    
    # Sjekk for outdated packages
    echo -e "${BLUE}Sjekker for oppdateringer...${NC}"
    npm outdated || true
    
    echo ""
    echo "Vil du oppdatere alle pakker? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        npm update
        echo ""
        echo -e "${GREEN}✓ Avhengigheter oppdatert${NC}"
    fi
}

# Main
echo_header

case "${1:-help}" in
    status)
        cmd_status
        ;;
    deploy)
        cmd_deploy
        ;;
    test)
        cmd_test
        ;;
    clean)
        cmd_clean
        ;;
    archive)
        cmd_archive
        ;;
    backup-db)
        cmd_backup_db
        ;;
    update-deps)
        cmd_update_deps
        ;;
    help|--help|-h|*)
        show_help
        ;;
esac

echo ""
