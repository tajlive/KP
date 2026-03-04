#!/bin/bash
# =============================================================================
# KLARPAKKE: Local Deploy Script with Database Migrations
# =============================================================================
# Dette scriptet automatiserer deploy fra lokal maskin:
#   1. Verifiserer miljø og tilkoblinger
#   2. Kjører migreringer (hvis nødvendig)
#   3. Bygger og deployer til Vercel
#   4. Verifiserer at alt fungerer
# =============================================================================

set -euo pipefail

# Farger for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Konfigurasjon
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$PROJECT_ROOT/logs/deploy_$TIMESTAMP.log"
ENVIRONMENT="${1:-production}"
SKIP_MIGRATIONS="${2:-false}"

# =============================================================================
# Hjelpefunksjoner
# =============================================================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[!]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ -d "/proc/$pid" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

preflight_checks() {
    log "🔍 Running pre-flight checks..."
    
    # Sjekk at vi er i riktig directory
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        error "package.json not found. Are you in the right directory?"
    fi
    
    # Sjekk nødvendige verktøy
    command -v node >/dev/null 2>&1 || error "Node.js is required but not installed"
    command -v npm >/dev/null 2>&1 || error "npm is required but not installed"
    
    # Sjekk Supabase CLI
    if ! command -v supabase >/dev/null 2>&1; then
        warning "Supabase CLI not found. Installing..."
        npm install -g supabase
    fi
    
    # Sjekk Vercel CLI
    if ! command -v vercel >/dev/null 2>&1; then
        warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Sjekk miljøvariabler
    if [ -z "${SUPABASE_PROJECT_ID:-}" ]; then
        if [ -f "$PROJECT_ROOT/.env.local" ]; then
            export $(grep -v '^#' "$PROJECT_ROOT/.env.local" | xargs) 2>/dev/null || true
        fi
    fi
    
    success "Pre-flight checks passed"
}

# =============================================================================
# Git Status Check
# =============================================================================

check_git_status() {
    log "🔍 Checking git status..."
    
    cd "$PROJECT_ROOT"
    
    # Sjekk om vi har uncommitted changes
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        warning "You have uncommitted changes!"
        read -p "Do you want to continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Sjekk at vi er på main/master
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
        warning "You are on branch: $CURRENT_BRANCH"
        read -p "Deploy from this branch? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    success "Git status checked (branch: $CURRENT_BRANCH)"
}

# =============================================================================
# Dependencies & Build Check
# =============================================================================

verify_build() {
    log "📦 Installing dependencies..."
    cd "$PROJECT_ROOT"
    npm ci --legacy-peer-deps >> "$LOG_FILE" 2>&1
    success "Dependencies installed"
    
    log "🔍 Running lint check..."
    npm run lint >> "$LOG_FILE" 2>&1 || error "Lint check failed!"
    success "Lint check passed"
    
    log "🔍 Running type check..."
    npm run type-check >> "$LOG_FILE" 2>&1 || warning "Type check had issues (continuing anyway)"
    
    log "🏗️  Building application..."
    npm run build >> "$LOG_FILE" 2>&1 || error "Build failed!"
    success "Build successful"
}

# =============================================================================
# Database Migrations
# =============================================================================

run_migrations() {
    if [ "$SKIP_MIGRATIONS" == "true" ]; then
        warning "Skipping database migrations (--skip-migrations)"
        return
    fi
    
    log "🗄️  Checking for database migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Sjekk om det finnes migreringer som ikke er kjørt
    MIGRATIONS=$(find supabase/migrations -name "*.sql" -type f 2>/dev/null | sort || true)
    
    if [ -z "$MIGRATIONS" ]; then
        success "No migrations found"
        return
    fi
    
    MIGRATION_COUNT=$(echo "$MIGRATIONS" | wc -l | tr -d ' ')
    log "Found $MIGRATION_COUNT migration files"
    
    # Vis migreringer som skal kjøres
    echo "$MIGRATIONS" | while read -r file; do
        echo "  - $(basename "$file")"
    done
    
    # Backup før migrering
    log "💾 Creating database backup (if possible)..."
    supabase db dump --project-ref "${SUPABASE_PROJECT_ID:-}" --data-only --file "backup_$TIMESTAMP.sql" 2>/dev/null || warning "Could not create backup (continuing anyway)"
    
    # Spør om bekreftelse
    read -p "Run database migrations? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warning "Skipping migrations"
        return
    fi
    
    # Kjør migreringer
    log "🔄 Running migrations..."
    supabase db push --project-ref "${SUPABASE_PROJECT_ID:-}" --include-all || error "Migration failed!"
    
    success "Database migrations completed"
    
    # Verifiser at kolonner finnes
    log "🔍 Verifying migrations..."
    supabase sql --project-ref "${SUPABASE_PROJECT_ID:-}" \
        -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('role', 'trading_mode', 'binance_api_key_encrypted') ORDER BY column_name;" \
        2>/dev/null || warning "Could not verify migrations"
}

# =============================================================================
# Deploy to Vercel
# =============================================================================

deploy_to_vercel() {
    log "🚀 Deploying to Vercel ($ENVIRONMENT)..."
    
    cd "$PROJECT_ROOT"
    
    if [ "$ENVIRONMENT" == "production" ]; then
        DEPLOYMENT_URL=$(vercel --prod --yes 2>&1 | tail -n 1)
    else
        DEPLOYMENT_URL=$(vercel --yes 2>&1 | tail -n 1)
    fi
    
    if [ $? -ne 0 ]; then
        error "Deployment failed!"
    fi
    
    success "Deployed to: $DEPLOYMENT_URL"
    echo "$DEPLOYMENT_URL" > "$PROJECT_ROOT/.last_deployment_url"
}

# =============================================================================
# Post-deploy Verification
# =============================================================================

verify_deployment() {
    log "🔍 Running post-deploy verification..."
    
    DEPLOYMENT_URL=$(cat "$PROJECT_ROOT/.last_deployment_url" 2>/dev/null || echo "")
    
    if [ -z "$DEPLOYMENT_URL" ]; then
        warning "Could not determine deployment URL"
        return
    fi
    
    # Vent på at deploy skal bli klar
    log "⏳ Waiting for deployment to be ready..."
    sleep 5
    
    # Test hovedsiden
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" == "200" ]; then
        success "Main page loads (HTTP $HTTP_CODE)"
    else
        error "Main page failed (HTTP $HTTP_CODE)"
    fi
    
    # Test /no7admin redirect
    log "🔍 Testing /no7admin redirect..."
    REDIRECT_CHECK=$(curl -s -o /dev/null -w "%{http_code}" -L "$DEPLOYMENT_URL/no7admin" 2>/dev/null || echo "000")
    
    if [ "$REDIRECT_CHECK" == "200" ] || [ "$REDIRECT_CHECK" == "307" ] || [ "$REDIRECT_CHECK" == "308" ]; then
        success "/no7admin redirect works"
    else
        warning "/no7admin redirect test inconclusive (HTTP $REDIRECT_CHECK) - may need authentication"
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    mkdir -p "$PROJECT_ROOT/logs"
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║        🚀 KLARPAKKE DEPLOY AUTOMATION 🚀                   ║"
    echo "║                                                            ║"
    echo "║  Environment: $ENVIRONMENT"
    echo "║  Log file: logs/deploy_$TIMESTAMP.log"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Parse argumenter
    while [[ $# -gt 0 ]]; do
        case $1 in
            --staging)
                ENVIRONMENT="staging"
                shift
                ;;
            --skip-migrations)
                SKIP_MIGRATIONS="true"
                shift
                ;;
            --help|-h)
                echo "Usage: ./scripts/deploy.sh [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --staging            Deploy to staging environment"
                echo "  --skip-migrations    Skip database migrations"
                echo "  --help, -h           Show this help message"
                echo ""
                echo "Examples:"
                echo "  ./scripts/deploy.sh                    # Deploy to production"
                echo "  ./scripts/deploy.sh --staging          # Deploy to staging"
                echo "  ./scripts/deploy.sh --skip-migrations  # Skip DB migrations"
                exit 0
                ;;
            *)
                shift
                ;;
        esac
    done
    
    log "Starting deployment process..."
    
    # Kjør alle steg
    preflight_checks
    check_git_status
    verify_build
    run_migrations
    deploy_to_vercel
    verify_deployment
    
    # Ferdig!
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                  ✅ DEPLOYMENT SUCCESSFUL!                 ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    success "All steps completed successfully!"
    
    DEPLOYMENT_URL=$(cat "$PROJECT_ROOT/.last_deployment_url" 2>/dev/null || echo "")
    if [ -n "$DEPLOYMENT_URL" ]; then
        echo ""
        echo "🔗 Deployment URL: $DEPLOYMENT_URL"
        echo "🔗 Admin URL: $DEPLOYMENT_URL/no7admin"
        echo ""
    fi
    
    log "Log saved to: $LOG_FILE"
}

# Kjør main
cd "$PROJECT_ROOT"
main "$@"
