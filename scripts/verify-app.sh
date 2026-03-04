#!/bin/bash
set -euo pipefail

# =============================================================================
# App Verification Script for Klarpakke
# Kjører type-check og build
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

cd "${PROJECT_ROOT}"

log_info "Starter verifisering av Klarpakke..."

# Sjekk at package.json eksisterer
if [ ! -f "package.json" ]; then
    log_error "package.json ikke funnet"
    exit 1
fi

# Installer avhengigheter hvis node_modules mangler
if [ ! -d "node_modules" ]; then
    log_info "node_modules mangler, kjører npm ci..."
    npm ci || {
        log_error "npm ci feilet"
        exit 1
    }
fi

# TypeScript type checking
log_info "Kjører TypeScript type-check..."
npm run type-check 2>&1 | tee /tmp/type-check.log || {
    log_error "TypeScript type-check feilet"
    echo "Se /tmp/type-check.log for detaljer"
    exit 1
}
log_success "TypeScript type-check OK"

# Build
log_info "Kjører Next.js build..."
npm run build 2>&1 | tee /tmp/build.log || {
    log_error "Build feilet"
    echo "Se /tmp/build.log for detaljer"
    exit 1
}
log_success "Build OK"

# Sjekk at .next eller out ble generert
if [ ! -d ".next" ] && [ ! -d "out" ] && [ ! -d ".open-next" ]; then
    log_error "Ingen build-output funnet (.next, out, eller .open-next)"
    exit 1
fi

log_success "Verifisering fullført!"
log_info "Build output: $(ls -ld .next out .open-next 2>/dev/null | wc -l) kataloger"
