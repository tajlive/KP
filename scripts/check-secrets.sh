#!/usr/bin/env bash
# =============================================================================
# CHECK: Secrets Scan
# =============================================================================
# Scanner kodebasen for potensielle secrets som kan ha blitt
# hardkodet ved uhell.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

ERRORS=0

echo "============================================================================="
log_info "SECRETS SCAN"
echo "============================================================================="

cd "$PROJECT_ROOT"

# =============================================================================
# Sjekk 1: API Keys (Stripe live keys)
# =============================================================================
echo ""
log_info "Sjekker for Stripe live API keys..."

if grep -r "sk_live_" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v ".next" | head -5; then
  log_error "Fant potensiell Stripe live secret key!"
  ERRORS=$((ERRORS + 1))
else
  log_success "Ingen Stripe live secret keys funnet"
fi

if grep -r "pk_live_" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v ".next" | head -5; then
  log_warn "Fant Stripe live publishable key (sjekk om denne er OK)"
else
  log_success "Ingen Stripe live publishable keys funnet"
fi

# =============================================================================
# Sjekk 2: Supabase service role key
# =============================================================================
echo ""
log_info "Sjekker for Supabase service_role key..."

if grep -r "service_role" --include="*.ts" --include="*.tsx" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v ".next" | head -5; then
  log_error "Fant potensiell service_role key!"
  ERRORS=$((ERRORS + 1))
else
  log_success "Ingen service_role keys funnet i koden"
fi

# =============================================================================
# Sjekk 3: Database passwords i connection strings
# =============================================================================
echo ""
log_info "Sjekker for database passwords i connection strings..."

if grep -rE "postgres://[^:]+:[^@]+@" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.env*" . 2>/dev/null | grep -v node_modules | grep -v ".next" | head -5; then
  log_error "Fant database connection string med passord!"
  ERRORS=$((ERRORS + 1))
else
  log_success "Ingen database passwords i connection strings"
fi

# =============================================================================
# Sjekk 4: JWT secrets
# =============================================================================
echo ""
log_info "Sjekker for JWT secrets..."

if grep -ri "jwt.*secret" --include="*.ts" --include="*.tsx" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v ".next" | grep -v "// " | head -5; then
  log_warn "Fant potensiell JWT secret referanse (sjekk manuelt)"
else
  log_success "Ingen JWT secrets funnet"
fi

# =============================================================================
# Sjekk 5: .env filer er i .gitignore
# =============================================================================
echo ""
log_info "Sjekker at .env filer er i .gitignore..."

if grep -q "\.env" .gitignore; then
  log_success ".env filer er i .gitignore"
else
  log_error ".env filer er IKKE i .gitignore!"
  ERRORS=$((ERRORS + 1))
fi

# =============================================================================
# Sjekk 6: Private keys
# =============================================================================
echo ""
log_info "Sjekker for private keys..."

if grep -r "BEGIN PRIVATE KEY" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.pem" . 2>/dev/null | grep -v node_modules | head -5; then
  log_error "Fant private key i koden!"
  ERRORS=$((ERRORS + 1))
else
  log_success "Ingen private keys funnet"
fi

if grep -r "BEGIN RSA PRIVATE KEY" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.pem" . 2>/dev/null | grep -v node_modules | head -5; then
  log_error "Fant RSA private key i koden!"
  ERRORS=$((ERRORS + 1))
else
  log_success "Ingen RSA private keys funnet"
fi

# =============================================================================
# Oppsummering
# =============================================================================
echo ""
echo "============================================================================="

if [ $ERRORS -eq 0 ]; then
  log_success "SECRETS SCAN BESTÅTT - Ingen hardkodede secrets funnet!"
  echo "============================================================================="
  exit 0
else
  log_error "FANT $ERRORS POTENSIELLE SECRETS!"
  echo "============================================================================="
  echo ""
  log_info "Hvis disse er falske positiver, kan du:"
  echo "  1. Legge til i scripts/check-secrets.sh exclude-liste"
  echo "  2. Flytte til miljøvariabler"
  exit 1
fi
