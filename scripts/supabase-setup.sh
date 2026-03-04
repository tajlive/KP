#!/bin/bash

# Supabase Production Setup Script for Klarpakke
# Dette scriptet setter opp hele Supabase-backend

set -e

echo "🚀 Klarpakke Supabase Setup"
echo "==========================="
echo ""

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Konfigurasjon
PROJECT_NAME="klarpakke-production"
REGION="eu-north-1"  # Stockholm - nærmest Norge

# Funksjoner
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Sjekk at Supabase CLI er installert
if ! command -v supabase &> /dev/null; then
    log_error "Supabase CLI ikke installert"
    echo "Installer med: npm install -g supabase"
    echo "Eller: brew install supabase"
    exit 1
fi

log_success "Supabase CLI funnet"

# Sjekk at bruker er logget inn
if ! supabase projects list &> /dev/null; then
    log_warning "Du er ikke logget inn i Supabase"
    echo "Kjør: supabase login"
    exit 1
fi

log_info "Starter setup..."
echo ""

# ============================================
# STEG 1: Opprett prosjekt
# ============================================
echo "📦 STEG 1: Opprette Supabase-prosjekt"
echo "--------------------------------------"

echo "For å opprette et nytt prosjekt, gå til:"
echo "https://app.supabase.com"
echo ""
echo "1. Klikk 'New Project'"
echo "2. Velg organisasjon"
echo "3. Navn: klarpakke-production"
echo "4. Region: Northern Europe (Stockholm)"
echo "5. Database Password: (generer sterk passord)"
echo ""
echo "Trykk ENTER når du har opprettet prosjektet..."
read -r

log_info "Henter prosjekt-informasjon..."

# Liste prosjekter
echo ""
echo "Dine prosjekter:"
supabase projects list
echo ""

echo "Skriv inn Project Reference (f.eks. abcdefghijklmnopqrst):"
read -r PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    log_error "Project Reference er påkrevd"
    exit 1
fi

# Link prosjekt
log_info "Linker til prosjekt: $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF"

log_success "Prosjekt linket!"
echo ""

# ============================================
# STEG 2: Database Migrations
# ============================================
echo "🗄️  STEG 2: Kjøre database-migrations"
echo "-------------------------------------"

log_info "Kjører migrations..."
supabase db push

log_success "Migrations fullført!"
echo ""

# ============================================
# STEG 3: Deploy Edge Functions
# ============================================
echo "⚡ STEG 3: Deploye Edge Functions"
echo "----------------------------------"

FUNCTIONS=(
    "upsert-profile-on-signup"
    "get-billing-status"
    "get-quiz"
    "submit-quiz"
    "get-referral-status"
    "get-entitlements"
    "get-strategies"
    "follow-strategy"
    "connect-exchange"
    "track-event"
    "update-user-settings"
    "update-notification-settings"
    "compute-leaderboard-monthly"
    "set-subscription-tier"
)

for func in "${FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$func" ]; then
        log_info "Deployer: $func"
        supabase functions deploy "$func" --project-ref "$PROJECT_REF"
    else
        log_warning "Function ikke funnet: $func"
    fi
done

log_success "Functions deployet!"
echo ""

# ============================================
# STEG 4: Sett Secrets
# ============================================
echo "🔐 STEG 4: Konfigurere Secrets"
echo "-------------------------------"

echo ""
echo "Du må nå sette følgende secrets:"
echo ""

echo "1. STRIPE_SECRET_KEY (sk_live_...)"
echo "   Få fra: https://dashboard.stripe.com/apikeys"
echo "   Skriv inn:"
read -rs STRIPE_SECRET
if [ -n "$STRIPE_SECRET" ]; then
    supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET" --project-ref "$PROJECT_REF"
    log_success "STRIPE_SECRET_KEY satt"
fi
echo ""

echo "2. STRIPE_WEBHOOK_SECRET (whsec_...)"
echo "   Få fra: Stripe Dashboard → Webhooks"
echo "   Skriv inn:"
read -rs STRIPE_WEBHOOK
if [ -n "$STRIPE_WEBHOOK" ]; then
    supabase secrets set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK" --project-ref "$PROJECT_REF"
    log_success "STRIPE_WEBHOOK_SECRET satt"
fi
echo ""

echo "3. SITE_URL (https://klarpakke.no)"
read -r SITE_URL
if [ -n "$SITE_URL" ]; then
    supabase secrets set SITE_URL="$SITE_URL" --project-ref "$PROJECT_REF"
    log_success "SITE_URL satt"
fi
echo ""

echo "4. TELEGRAM_BOT_TOKEN (valgfritt nå)"
echo "   Få fra: @BotFather på Telegram"
echo "   Skriv inn (eller trykk ENTER for å hoppe over):"
read -rs TELEGRAM_TOKEN
if [ -n "$TELEGRAM_TOKEN" ]; then
    supabase secrets set TELEGRAM_BOT_TOKEN="$TELEGRAM_TOKEN" --project-ref "$PROJECT_REF"
    supabase secrets set TELEGRAM_FREE_CHANNEL="@klarpakke_free" --project-ref "$PROJECT_REF"
    supabase secrets set TELEGRAM_VIP_CHANNEL="@klarpakke_vip" --project-ref "$PROJECT_REF"
    log_success "Telegram config satt"
fi
echo ""

log_success "Secrets konfigurert!"
echo ""

# ============================================
# STEG 5: Auth Konfigurasjon
# ============================================
echo "👤 STEG 5: Konfigurere Auth"
echo "--------------------------"

echo ""
echo "Konfigurer Auth i Supabase Dashboard:"
echo "https://app.supabase.com/project/$PROJECT_REF/auth/settings"
echo ""
echo "Site URL: https://klarpakke.no"
echo ""
echo "Redirect URLs:"
echo "  - https://klarpakke.no/app/dashboard"
echo "  - https://klarpakke.no/quiz"
echo "  - https://klarpakke.no/login"
echo ""
echo "Email Templates:"
echo "  - Tilpass Confirmation email på norsk"
echo "  - Tilpass Reset password email på norsk"
echo ""
echo "Trykk ENTER når du har konfigurert Auth..."
read -r

log_success "Auth konfigurert!"
echo ""

# ============================================
# STEG 6: Verifisering
# ============================================
echo "✅ STEG 6: Verifisere setup"
echo "--------------------------"

log_info "Sjekker database-tilkobling..."
supabase db dump --data-only > /tmp/verify.sql 2>&1 && log_success "Database tilgjengelig" || log_error "Database-feil"

log_info "Sjekker functions..."
supabase functions list --project-ref "$PROJECT_REF"

echo ""
log_success "Setup fullført!"
echo ""

# ============================================
# OPPSUMMERING
# ============================================
echo "🎉 SUPABASE ER KLAR!"
echo "===================="
echo ""
echo "Project Reference: $PROJECT_REF"
echo "Project URL: https://app.supabase.com/project/$PROJECT_REF"
echo "API URL: https://$PROJECT_REF.supabase.co"
echo ""
echo "Neste steg:"
echo "1. Kopier SUPABASE_URL og SUPABASE_ANON_KEY til Webflow"
echo "2. Konfigurer Webflow Custom Code"
echo "3. Test signup-flow"
echo ""
echo "Supabase dokumentasjon:"
echo "https://supabase.com/docs"
echo ""

# Lagre konfigurasjon
cat > .env.supabase << EOF
# Supabase Konfigurasjon
SUPABASE_URL=https://$PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=(finn i Supabase Dashboard → Settings → API)
SUPABASE_PROJECT_REF=$PROJECT_REF
EOF

log_info "Konfigurasjon lagret i: .env.supabase"
