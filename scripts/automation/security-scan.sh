#!/bin/bash
# Security Scan Automatisering
# Kjør: bash scripts/automation/security-scan.sh

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           🔒 Security Scan                                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

ERRORS=0

# 1. npm audit
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "1/5: NPM Audit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if npm audit --audit-level=high 2>&1 | grep -q "found 0 vulnerabilities"; then
    log_success "Ingen høyrisiko sårbarheter funnet"
else
    log_warning "Sårbarheter funnet - kjør 'npm audit fix' for å fikse"
    ((ERRORS++))
fi

# 2. Sjekk for secrets
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "2/5: Secrets Scan"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v gitleaks &> /dev/null; then
    if gitleaks detect --source . --redact; then
        log_success "Ingen secrets funnet"
    else
        log_error "Potensielle secrets funnet!"
        ((ERRORS++))
    fi
else
    log_warning "gitleaks ikke installert. Installer: brew install gitleaks"
    
    # Fallback: sjekk for vanlige patterns
    if grep -r "AKIA[0-9A-Z]\{16\}" . --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null; then
        log_error "Potensielle AWS keys funnet!"
        ((ERRORS++))
    fi
fi

# 3. Sjekk for hardkodede passord
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "3/5: Hardkodede Credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -r "password.*=.*['\"][^'\"]\+['\"]" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "password=''" | head -5; then
    log_warning "Potensielle hardkodede passord funnet"
    ((ERRORS++))
else
    log_success "Ingen hardkodede passord funnet"
fi

# 4. Sjekk .env filer
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "4/5: Environment Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if git check-ignore -q .env.local 2>/dev/null || grep -q ".env.local" .gitignore; then
    log_success ".env.local er i .gitignore"
else
    log_error ".env.local er IKKE i .gitignore!"
    ((ERRORS++))
fi

# 5. Sjekk for console.log i production kode
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "5/5: Console.log Sjekk"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CONSOLE_COUNT=$(grep -r "console\.log\|console\.warn\|console\.error" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
if [ "$CONSOLE_COUNT" -gt 20 ]; then
    log_warning "Mange console statements ($CONSOLE_COUNT) - vurder å rydde"
else
    log_success "Console statements OK ($CONSOLE_COUNT)"
fi

# Oppsummering
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
    log_success "Security scan fullført - ingen kritiske funn!"
    exit 0
else
    log_error "Security scan fant $ERRORS problemer"
    exit 1
fi
