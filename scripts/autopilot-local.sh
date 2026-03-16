#!/bin/bash
set -euo pipefail

# =============================================================================
# Master Autopilot Script for Klarpakke - LOCAL EXECUTION
# Kjører full kjeden: verify → (db) → build → smoke (local)
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Farger for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cd "${PROJECT_ROOT}"

# Hjelpefunksjon for å kjøre steg
run_step() {
    local step_name="$1"
    local script="$2"
    
    log_header "$step_name"
    
    if bash "$script"; then
        log_success "$step_name fullført!"
        return 0
    else
        log_error "$step_name FEILET!"
        return 1
    fi
}

# === MAIN ===

echo -e "${GREEN}"
echo "  _  ________       __  _                  _    "
echo " | |/ /  _ \ \     / / | | ___ _ __   __ _| | __"
echo " | ' /| |_) \ \   / /  | |/ _ \ '_ \ / _\` | |/ /"
echo " | . <|  __/ \ \ / /   | |  __/ |_) | (_| |   < "
echo " |_|\_\_|     \_\_/    |_|\___| .__/ \__,_|_|\_\\"
echo "                              |_|               "
echo -e "${NC}"

log_info "Starter Klarpakke Autopilot (lokal kjøring)..."
log_info "Prosjekt: $PROJECT_ROOT"
log_info "Tid: $(date)"

START_TIME=$(date +%s)

# STEG 1: Verifiser
run_step "VERIFISERING" "scripts/verify-app.sh" || exit 1

# STEG 2: Database migrasjon (valgfritt)
echo ""
read -p "Kjøre database migrasjoner? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_step "DATABASE MIGRASJON" "scripts/db-migrate-supabase.sh" || exit 1
else
    log_warn "Hopper over database migrasjoner"
fi

# STEG 3: Miljø-synkronisering (valgfritt)
echo ""
read -p "Synkronisere miljøvariabler? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_step "MILJØ-SYNKRONISERING" "scripts/sync-env-all.sh" || log_warn "Miljø-synkronisering feilet (ikke kritisk)"
else
    log_warn "Hopper over miljø-synkronisering"
fi

# STEG 4: Deploy (valgfritt - kun hvis env vars er satt)
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
    echo ""
    read -p "Deploy til Cloudflare Pages? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_step "DEPLOY TIL CLOUDFLARE" "scripts/deploy-cloudflare-pages.sh" || exit 1
        
        # STEG 5: Smoke test mot produksjon
        echo ""
        read -p "Kjøre smoke-tester mot produksjon? (y/N) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            run_step "SMOKE TEST PRODUKSJON" "scripts/smoke-test-prod.sh" || exit 1
        fi
    fi
else
    log_warn "CLOUDFLARE_API_TOKEN ikke satt - hopper over deploy"
fi

# STEG 6: Stripe test (dokumentasjon)
echo ""
read -p "Vise Stripe test-instruksjoner? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    bash "scripts/test-stripe-checkout.sh"
fi

# Oppsummering
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

log_header "AUTOPILOT FULLFØRT"
log_info "Total tid: ${DURATION} sekunder"
log_success "Klar for lansering!"

echo ""
echo -e "${CYAN}Neste steg:${NC}"
echo "  1. Push til main: git push origin main"
echo "  2. GitHub Actions tar over: db → verify → deploy → smoke"
echo "  3. Overvåk deploy på: https://github.com/tajlive/KP/actions"
echo ""
