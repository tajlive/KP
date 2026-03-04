#!/bin/bash
set -euo pipefail

# =============================================================================
# Stripe Test Script for Klarpakke
# Verifiserer Stripe integrasjon med testkort
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

log_info "================================================"
log_info "STRIPE TEST-FLYT FOR KLARPAKKE"
log_info "================================================"
echo ""

# Sjekk at vi har Stripe CLI
if command -v stripe &> /dev/null; then
    log_info "Stripe CLI funnet"
    
    # Sjekk login status
    if stripe config --list 2>/dev/null | grep -q "default"; then
        log_success "Stripe CLI er logget inn"
        
        # Start lytter for webhook events (valgfritt)
        log_info "For å teste webhooks lokalt, kjør:"
        log_info "  stripe listen --forward-to localhost:3000/api/stripe/webhook"
    else
        log_warn "Stripe CLI ikke logget inn. Kjør: stripe login"
    fi
else
    log_warn "Stripe CLI ikke installert"
    log_info "Installer med: brew install stripe/stripe-cli/stripe"
fi

echo ""
log_info "================================================"
log_info "MANUELL TEST-FLYT"
log_info "================================================"
echo ""
log_info "1. Start lokal server:"
log_info "   npm run dev"
echo ""
log_info "2. Åpne i nettleser:"
log_info "   http://localhost:3000/priser"
echo ""
log_info "3. Velg en prisplan og klikk 'Bli med'"
echo ""
log_info "4. I Stripe Checkout, bruk testkort:"
echo ""
echo -e "   ${GREEN}Kortnummer: 4242 4242 4242 4242${NC}"
echo -e "   ${GREEN}Utløp: 12/34${NC}"
echo -e "   ${GREEN}CVC: 123${NC}"
echo -e "   ${GREEN}Postnummer: 1234${NC}"
echo ""
log_info "5. Fullfør betalingen"
echo ""
log_info "6. Verifiser at du blir redirected til /priser/success"
echo ""

# Hvis Stripe CLI er tilgjengelig, tilby å trigge test event
if command -v stripe &> /dev/null && stripe config --list 2>/dev/null | grep -q "default"; then
    log_info "================================================"
    log_info "AUTOMATISERTE TESTER (med Stripe CLI)"
    log_info "================================================"
    echo ""
    
    # Hent testmode price ID hvis tilgjengelig
    if [ -n "${STRIPE_TEST_PRICE_ID:-}" ]; then
        log_info "STRIPE_TEST_PRICE_ID er satt: ${STRIPE_TEST_PRICE_ID}"
    else
        log_warn "STRIPE_TEST_PRICE_ID ikke satt"
        log_info "Sett med: export STRIPE_TEST_PRICE_ID=price_xxx"
    fi
    
    echo ""
    log_info "For å trigge en test checkout session:"
    log_info "  stripe checkout sessions create \\"
    log_info "    --success-url=http://localhost:3000/priser/success?session_id={CHECKOUT_SESSION_ID} \\"
    log_info "    --cancel-url=http://localhost:3000/priser/cancel \\"
    log_info "    --mode=subscription \\"
    log_info "    --line-items=[{\"price\":\"${STRIPE_TEST_PRICE_ID:-price_xxx}\",\"quantity\":1}]"
fi

echo ""
log_info "================================================"
log_info "VERIFISERING I PRODUKSJON"
log_info "================================================"
echo ""
log_info "Etter deploy til produksjon:"
log_info "1. Gå til https://www.klarpakke.no/priser"
log_info "2. Bruk SAMME testkort (4242 4242 4242 4242)"
log_info "3. Verifiser at betaling går gjennom"
log_info "4. Sjekk at du mottar webhook event i Supabase"
echo ""
log_warn "VIKTIG: Testkort fungerer kun i test-modus!"
log_warn "I produksjon med live nøkler vil testkort bli avvist."
echo ""
