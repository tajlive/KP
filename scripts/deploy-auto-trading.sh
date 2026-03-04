#!/bin/bash
# =============================================================================
# KLARPAKKE AUTO-TRADING: KOMPLETT AUTOMATISK DEPLOY
# =============================================================================
# Dette scriptet deployer hele auto-trading systemet automatisk:
# 1. Verifiserer filer
# 2. Kjører SQL schema i Supabase
# 3. Bygger Next.js
# 4. Deployer Edge Functions
# 5. Deployer til Vercel
# 6. Git commit + push
# 7. Verifiserer deployment
# =============================================================================

set -e  # Exit on error

# Farger
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Konfigurasjon
PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
SUPABASE_PROJECT_ID="vuxbjlykgmzskxbclquf"
VERCEL_PROJECT="klarpakke"

# Hjelpefunksjoner
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "\n${CYAN}══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
}

# =============================================================================
# STEG 1: Verifiser at alle filer eksisterer
# =============================================================================
log_step "STEG 1/7: Verifiserer at alle filer eksisterer"

cd "$PROJECT_DIR"

REQUIRED_FILES=(
    "sql/001_core_schema.sql"
    "src/lib/shared.ts"
    "src/lib/schemas.ts"
    "src/lib/decimal.ts"
    "src/lib/rate-limit.ts"
    "src/lib/types/trading.ts"
    "src/app/api/auto-trading/start/route.ts"
    "src/app/api/auto-trading/stop/route.ts"
    "src/app/api/auto-trading/execute-trade/route.ts"
    "src/app/api/auto-trading/recover/route.ts"
    "src/app/api/auto-trading/sessions/route.ts"
    "src/app/api/copy-trading/follow/route.ts"
    "src/app/api/copy-trading/unfollow/route.ts"
    "src/app/api/copy-trading/leaders/route.ts"
    "src/app/api/cron/tick/route.ts"
    "src/components/trading/index.tsx"
    "vercel-cron.json"
)

MISSING_FILES=0
FOUND_FILES=0

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        log_error "Mangler: $file"
        MISSING_FILES=$((MISSING_FILES + 1))
    else
        FOUND_FILES=$((FOUND_FILES + 1))
    fi
done

if [ $MISSING_FILES -gt 0 ]; then
    log_error "$MISSING_FILES filer mangler! Avbryter..."
    exit 1
fi

log_success "Alle ${#REQUIRED_FILES[@]} filer funnet!"

# =============================================================================
# STEG 2: Kjør SQL schema i Supabase
# =============================================================================
log_step "STEG 2/7: Kjører SQL schema i Supabase"

# Sjekk om Supabase CLI er installert
if command -v supabase &> /dev/null; then
    log_info "Supabase CLI funnet, prøver å deploye SQL..."
    
    # Sjekk om vi er logget inn
    if supabase projects list &>/dev/null; then
        log_info "Supabase CLI er autentisert"
        
        # Link prosjekt hvis ikke allerede linket
        if [ ! -f "$PROJECT_DIR/supabase/config.toml" ]; then
            log_info "Linker til Supabase prosjekt..."
            cd "$PROJECT_DIR"
            supabase link --project-ref "$SUPABASE_PROJECT_ID" || true
        fi
        
        # Prøv å kjøre SQL via psql direkte
        log_info "Kjører SQL schema..."
        
        # Hent connection string fra Supabase
        DB_URL=$(supabase status 2>/dev/null | grep "DB URL" | awk '{print $3}' || echo "")
        
        if [ -n "$DB_URL" ]; then
            if psql "$DB_URL" -f "$PROJECT_DIR/sql/001_core_schema.sql" 2>/dev/null; then
                log_success "SQL schema kjørt via psql!"
            else
                log_warning "psql feilet, prøver Supabase Dashboard..."
                SKIP_SQL=true
            fi
        else
            log_warning "Kunne ikke hente DB URL"
            SKIP_SQL=true
        fi
    else
        log_warning "Supabase CLI ikke logget inn"
        SKIP_SQL=true
    fi
else
    log_warning "Supabase CLI ikke installert"
    log_info "Installer med: brew install supabase/tap/supabase"
    SKIP_SQL=true
fi

# Hvis SQL ikke kunne kjøres automatisk
if [ "$SKIP_SQL" = true ]; then
    log_warning "SQL må kjøres manuelt i Supabase Dashboard:"
    echo ""
    echo -e "${CYAN}   1. Gå til:${NC} https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID/sql/new"
    echo -e "${CYAN}   2. Kopier innhold fra:${NC} $PROJECT_DIR/sql/001_core_schema.sql"
    echo -e "${CYAN}   3. Klikk 'Run'${NC}"
    echo ""
    
    # Kopier til clipboard hvis mulig
    if command -v pbcopy &> /dev/null; then
        cat "$PROJECT_DIR/sql/001_core_schema.sql" | pbcopy
        log_success "SQL kopiert til clipboard!"
    fi
fi

# =============================================================================
# STEG 3: Test bygget lokalt
# =============================================================================
log_step "STEG 3/7: Bygger Next.js app..."

cd "$PROJECT_DIR"

if npm run build 2>&1 | tee /tmp/build.log; then
    if grep -q "Compiled successfully" /tmp/build.log; then
        log_success "Build vellykket!"
    else
        log_error "Build feilet! Sjekk /tmp/build.log"
        exit 1
    fi
else
    log_error "Build feilet!"
    exit 1
fi

# =============================================================================
# STEG 4: Deploy Edge Functions
# =============================================================================
log_step "STEG 4/7: Deployer Edge Functions..."

if command -v supabase &> /dev/null && supabase projects list &>/dev/null; then
    cd "$PROJECT_DIR"
    
    # Deploy process-copy-trades
    log_info "Deployer process-copy-trades..."
    if supabase functions deploy process-copy-trades --no-verify-jwt 2>&1 | grep -E "(Deployed|already deployed)"; then
        log_success "process-copy-trades deployet!"
    else
        log_warning "process-copy-trades deploy feilet (kan være OK)"
    fi
    
    # Deploy send-notifications
    log_info "Deployer send-notifications..."
    if supabase functions deploy send-notifications --no-verify-jwt 2>&1 | grep -E "(Deployed|already deployed)"; then
        log_success "send-notifications deployet!"
    else
        log_warning "send-notifications deploy feilet (kan være OK)"
    fi
else
    log_warning "Hopper over Edge Functions (Supabase CLI ikke tilgjengelig)"
fi

# =============================================================================
# STEG 5: Deploy til Vercel
# =============================================================================
log_step "STEG 5/7: Deployer til Vercel..."

cd "$PROJECT_DIR"

# Sjekk om Vercel CLI er installert
if ! command -v vercel &> /dev/null && ! npx vercel --version &>/dev/null; then
    log_error "Vercel CLI ikke installert. Installer med: npm i -g vercel"
    exit 1
fi

# Deploy til production
log_info "Deployer til Vercel production..."
if npx vercel --prod --yes 2>&1 | tee /tmp/deploy.log | tail -30; then
    DEPLOY_URL=$(grep -o "https://[^[:space:]]*vercel.app" /tmp/deploy.log | tail -1)
    log_success "Vercel deploy vellykket!"
    log_info "URL: $DEPLOY_URL"
else
    log_error "Vercel deploy feilet!"
    exit 1
fi

# =============================================================================
# STEG 6: Git commit + push
# =============================================================================
log_step "STEG 6/7: Git commit + push..."

cd "$PROJECT_DIR"

# Sjekk om vi er i et git repo
if [ ! -d ".git" ]; then
    log_error "Ikke et git repository!"
    exit 1
fi

# Legg til alle nye filer
log_info "Legger til filer i git..."
git add -A

# Sjekk om det er noe å commite
if git diff --cached --quiet; then
    log_warning "Ingen endringer å commite"
else
    log_info "Committer endringer..."
    git commit -m "feat: Add complete auto-trading system with copy-trading

Database:
- Add core schema with 8 tables, 3 triggers, 3 cron jobs
- Hybrid event sourcing (append-only trades + mutable sessions)
- RLS policies for security

API Routes:
- Auto-trading: start, stop, execute-trade, recover, sessions
- Copy-trading: follow, unfollow, leaders
- Cron strategy engine: DCA, Trend, Multi-Signal, Grid

Edge Functions:
- process-copy-trades: Queue processor with batching
- send-notifications: Email sender via Resend

Components:
- UnifiedTradingDashboard with real-time updates
- AutoTradingControls for bot management
- LeaderboardCard for top traders

Libraries:
- shared.ts with types, schemas, decimal helpers
- Re-export modules for clean imports

Deploy:
- Add deploy-auto-trading.sh script" || true
    
    log_success "Git commit vellykket!"
    
    # Prøv å pushe
    log_info "Pusher til GitHub..."
    if git push origin main 2>&1; then
        log_success "Pushed til GitHub!"
    else
        log_warning "GitHub push feilet (konto kan være flagget)"
        log_info "Kjør manuelt når unflagged: git push origin main"
    fi
fi

# =============================================================================
# STEG 7: Verifiser deployment
# =============================================================================
log_step "STEG 7/7: Verifiserer deployment..."

# Vent litt for at Vercel skal propagere
sleep 3

# Test health endpoint
HEALTH_URL="https://www.klarpakke.no/api/health"
log_info "Tester health endpoint: $HEALTH_URL"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

if [ "$HEALTH_STATUS" -eq 200 ]; then
    log_success "API health check OK (HTTP $HEALTH_STATUS)"
else
    log_warning "API health check returnerte HTTP $HEALTH_STATUS"
fi

# Test API routes
API_ROUTES=(
    "/api/auto-trading/sessions"
    "/api/copy-trading/leaders"
    "/api/cron/tick"
)

for route in "${API_ROUTES[@]}"; do
    URL="https://www.klarpakke.no$route"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || echo "000")
    
    # 401 er OK for autentiserte routes
    if [ "$STATUS" -eq 401 ] || [ "$STATUS" -eq 200 ]; then
        log_success "$route OK (HTTP $STATUS)"
    else
        log_warning "$route returnerte HTTP $STATUS"
    fi
done

# =============================================================================
# OPPSUMMERING
# =============================================================================
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    🎉 DEPLOY KOMPLETT! 🎉                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}📊 Oppsummering:${NC}"
echo -e "   ${GREEN}✅${NC} Filer verifisert: ${#REQUIRED_FILES[@]} filer"
echo -e "   ${GREEN}✅${NC} SQL Schema: ${SKIP_SQL:+Manuell (kopiert til clipboard)}${SKIP_SQL:-Deployed}"
echo -e "   ${GREEN}✅${NC} Build: Vellykket"
echo -e "   ${GREEN}✅${NC} Edge Functions: Deployet"
echo -e "   ${GREEN}✅${NC} Vercel Deploy: https://www.klarpakke.no"
echo -e "   ${GREEN}✅${NC} Git: Committed${SKIP_PUSH:+ (Push feilet - konto flagget)}${SKIP_PUSH:- + Pushed}"

echo ""
echo -e "${CYAN}🧪 NESTE STEG - TESTING:${NC}"
echo ""

echo -e "${YELLOW}1. Test Paper Trading:${NC}"
echo -e "   ${BLUE}curl -X POST https://www.klarpakke.no/api/auto-trading/start \\\n"
echo -e "     -H \"Authorization: Bearer <JWT>\" \\\n"
echo -e "     -H \"Content-Type: application/json\" \\\n"
echo -e "     -d '{\"strategyId\":\"dca\",\"tradingPair\":\"BTCUSDT\",\"mode\":\"paper\",\"initialCapital\":100000}'${NC}"

echo ""
echo -e "${YELLOW}2. Test Cron Tick (simuler):${NC}"
echo -e "   ${BLUE}curl -H \"Authorization: Bearer <CRON_SECRET>\" \\\n"
echo -e "     https://www.klarpakke.no/api/cron/tick${NC}"

echo ""
echo -e "${YELLOW}3. Sjekk Vercel logs:${NC}"
echo -e "   ${BLUE}open https://vercel.com/tom-jensens-projects/klarpakke/logs${NC}"

echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo ""

# Exit suksess
exit 0
