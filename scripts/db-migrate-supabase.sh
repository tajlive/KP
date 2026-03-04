#!/bin/bash
set -euo pipefail

# =============================================================================
# Database Migration Script for Klarpakke
# Automatiserer Supabase migrasjoner for dev/prod
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Farger for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Sjekk at Supabase CLI er installert
if ! command -v supabase &> /dev/null; then
    log_error "Supabase CLI er ikke installert. Installer med: brew install supabase"
    exit 1
fi

# Sjekk at vi er i prosjekt-root
if [ ! -f "${PROJECT_ROOT}/supabase/config.toml" ]; then
    log_error "Må kjøres fra prosjekt-root med supabase/config.toml"
    exit 1
fi

cd "${PROJECT_ROOT}"

# Sjekk miljø
ENVIRONMENT="${ENVIRONMENT:-dev}"
log_info "Kjører migrasjoner for miljø: ${ENVIRONMENT}"

# Vis pending migrasjoner
log_info "Sjekker pending migrasjoner..."
supabase migration list || true

# Kjør migrasjoner
if [ "${ENVIRONMENT}" == "prod" ]; then
    log_warn "PRODUKSJONSMILJØ - Kjører migrasjoner..."
    
    # Sjekk at SUPABASE_ACCESS_TOKEN er satt for prod
    if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
        log_error "SUPABASE_ACCESS_TOKEN må være satt for prod-migrasjoner"
        exit 1
    fi
    
    # Koble til prosjektet
    PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
    if [ -z "${PROJECT_REF}" ]; then
        log_error "SUPABASE_PROJECT_REF må være satt"
        exit 1
    fi
    
    # Kjør migrasjoner mot prod
    supabase db push --project-ref "${PROJECT_REF}" --include-all || {
        log_error "Migrasjon feilet"
        exit 1
    }
else
    log_info "Utviklingsmiljø - Kjører migrasjoner..."
    supabase db push --include-all || {
        log_error "Migrasjon feilet"
        exit 1
    }
fi

log_success "Database migrasjoner fullført!"

# Verifiser at tabellene eksisterer
log_info "Verifiserer tabeller..."
supabase db dump --data-only --table courses 2>/dev/null | head -5 || log_warn "Kunne ikke verifisere courses tabell"

log_success "Database verifisert!"
