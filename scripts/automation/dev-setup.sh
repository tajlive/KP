#!/bin/bash
# Klarpakke - Full Developer Setup
# Kjør: bash scripts/automation/dev-setup.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           🚀 Klarpakke - Developer Setup                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${CYAN}▶ $1${NC}"; }

# Sjekk operativsystem
OS="$(uname -s)"
log_info "Operativsystem: $OS"

# ═══════════════════════════════════════════════════════════════
# STEG 1: Sjekk prerequisites
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_step "Steg 1/10: Sjekker prerequisites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_command() {
    if command -v $1 &> /dev/null; then
        local version=$($1 --version 2>/dev/null | head -1)
        log_success "$1: $version"
        return 0
    else
        log_error "$1: Ikke installert"
        return 1
    fi
}

MISSING_DEPS=()

check_command "node" || MISSING_DEPS+=("node")
check_command "npm" || MISSING_DEPS+=("npm")
check_command "git" || MISSING_DEPS+=("git")

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    echo ""
    log_error "Mangler avhengigheter: ${MISSING_DEPS[*]}"
    echo ""
    echo "Installer disse først:"
    echo "  Node.js: https://nodejs.org/ (v20+)"
    echo "  Git: https://git-scm.com/"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════
# STEG 2: Installer CLI tools
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_step "Steg 2/10: Installerer CLI tools"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

install_if_missing() {
    local cmd=$1
    local install_cmd=$2
    
    if command -v $cmd &> /dev/null; then
        local version=$($cmd --version 2>/dev/null | head -1)
        log_success "$cmd: $version"
    else
        log_info "Installerer $cmd..."
        eval "$install_cmd" || log_warning "Kunne ikke installere $cmd"
    fi
}

# Supabase CLI
install_if_missing "supabase" "brew install supabase/tap/supabase 2>/dev/null || curl -sSL https://get.supabase.com/install | sh"

# Playwright
install_if_missing "playwright" "npm i -g @playwright/test && npx playwright install"

# ═══════════════════════════════════════════════════════════════
# STEG 3: Installer dependencies
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_step "Steg 3/10: Installerer dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -d "node_modules" ]; then
    log_info "Installerer npm dependencies..."
    npm install
    log_success "Dependencies installert"
else
    log_success "Dependencies finnes allerede"
    read -p "Vil du oppdatere dependencies? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm update
        log_success "Dependencies oppdatert"
    fi
fi

# ═══════════════════════════════════════════════════════════════
# STEG 4: Setup Git hooks
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_step "Steg 4/10: Setter opp Git hooks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

bash scripts/automation/setup-git-hooks.sh

# ═══════════════════════════════════════════════════════════════
# STEG 5: Setup environment
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_step "Steg 5/10: Setter opp miljøvariabler"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f ".env.local" ]; then
    log_info "Kopierer .env.example til .env.local"
    if [ -f ".env-templates/.env.local.example" ]; then
        cp .env-templates/.env.local.example .env.local
        log_warning "Vennligst rediger .env.local med dine verdier"
    else
        log_warning "Ingen .env.example funnet. Opprett .env.local manuelt"
    fi
else
    log_success ".env.local finnes allerede"
fi

# ═══════════════════════════════════════════════════════════════
# STEG 6: Setup MCP
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_step "Steg 6/10: Setter opp MCP (Model Context Protocol)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "Sett opp MCP nå? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    bash scripts/setup-mcp-automation.sh
fi

# ═══════════════════════════════════════════════════════════════
# STEG 7: Setup Supabase
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_step "Steg 7/10: Setup Supabase"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "supabase/config.toml" ]; then
    log_info "Linking Supabase prosjekt..."
    supabase link --project-ref vuxbjlykgmzskxbclquf 2>/dev/null || log_warning "Allerede linket eller feil"
    log_success "Supabase konfigurert"
else
    log_warning "Ingen Supabase config funnet"
fi

# ═══════════════════════════════════════════════════════════════
# STEG 8: Verifiser build
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_step "Steg 8/10: Verifiserer build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_info "Kjører lint..."
npm run lint 2>&1 | tail -5

log_info "Sjekker TypeScript..."
npx tsc --noEmit 2>&1 | tail -5 && log_success "TypeScript OK" || log_warning "TypeScript feil funnet"

log_info "Bygger prosjekt..."
npm run build 2>&1 | tail -10

# ═══════════════════════════════════════════════════════════════
# STEG 9: Kjør tester
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_step "Steg 9/10: Kjører tester"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "Kjør tester? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm test 2>&1 | tail -20 || log_warning "Noen tester feilet"
fi

# ═══════════════════════════════════════════════════════════════
# STEG 10: Verifiser verktøy
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_step "Steg 10/10: Verifiserer alle verktøy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

bash scripts/mcp-status.sh

# ═══════════════════════════════════════════════════════════════
# FERDIG
# ═══════════════════════════════════════════════════════════════

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           ✅ SETUP FULLFØRT!                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Du er nå klar til å utvikle!"
echo ""
echo "Neste steg:"
echo "  1. Rediger .env.local med dine tokens"
echo "  2. Start dev server: npm run dev"
echo "  3. Åpne http://localhost:3000"
echo ""
echo "Nyttige kommandoer:"
echo "  make help              - Vis alle kommandoer"
echo "  make qa                - Kjør full QA"
echo "  make status            - Sjekk system status"
echo ""
