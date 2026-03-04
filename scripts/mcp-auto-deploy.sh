#!/bin/bash
# MCP Auto Deploy - Full CI/CD via MCP
# Kjør: bash scripts/mcp-auto-deploy.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🚀 MCP AUTO DEPLOY PIPELINE                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Funksjoner
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Steg 1: Pre-flight checks
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 PRE-FLIGHT CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Sjekk git status
if ! git diff-index --quiet HEAD --; then
    log_warning "Ucommitted changes funnet"
    git status --short
    echo ""
    read -p "Vil du fortsette? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Sjekk tokens
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    log_error "SUPABASE_ACCESS_TOKEN ikke satt"
    log_info "Kjør: source .env.mcp.local"
    exit 1
fi

if [ -z "$VERCEL_TOKEN" ]; then
    log_error "VERCEL_TOKEN ikke satt"
    log_info "Kjør: source .env.mcp.local"
    exit 1
fi

log_success "Tokens OK"
echo ""

# Steg 2: SQL Migration (via MCP)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  SQL MIGRATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "supabase/migrations/001_trading_system.sql" ]; then
    log_info "Finner SQL migrering..."
    
    # Sjekk om vi kan bruke Supabase CLI direkte
    if supabase db push --dry-run 2>/dev/null | grep -q "migrations"; then
        log_info "Kjører SQL migrering via Supabase CLI..."
        echo "Y" | supabase db push --include-all 2>&1 | tail -20
        log_success "SQL migrering fullført!"
    else
        log_warning "Kunne ikke kjøre migrering automatisk"
        log_info "Bruk Supabase MCP tool 'execute_sql' manuelt"
        log_info "SQL-fil: supabase/migrations/001_trading_system.sql"
    fi
else
    log_info "Ingen SQL migrering funnet"
fi
echo ""

# Steg 3: Build check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 BUILD CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

log_info "Kjører npm run build..."
if npm run build 2>&1 | tail -20 | grep -q "error"; then
    log_error "Build feilet!"
    exit 1
fi
log_success "Build OK!"
echo ""

# Steg 4: Deploy Edge Functions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚡ DEPLOY EDGE FUNCTIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

EDGE_FUNCTIONS=$(ls supabase/functions/ 2>/dev/null || echo "")
if [ -n "$EDGE_FUNCTIONS" ]; then
    for fn in $EDGE_FUNCTIONS; do
        if [ -d "supabase/functions/$fn" ]; then
            log_info "Deployer: $fn"
            supabase functions deploy "$fn" 2>&1 | tail -5
            log_success "$fn deployet!"
        fi
    done
else
    log_info "Ingen Edge Functions å deploye"
fi
echo ""

# Steg 5: Git commit & push
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 GIT DEPLOY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Commit message: " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="Auto deploy via MCP $(date '+%Y-%m-%d %H:%M')"
fi

git add -A
git commit -m "$commit_msg" || log_warning "Ingen changes å commite"
git push origin main
log_success "Git push fullført!"
echo ""

# Steg 6: Vercel Deploy
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 VERCEL DEPLOY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

log_info "Trigger Vercel deploy..."
npx vercel --prod --token "$VERCEL_TOKEN" --yes 2>&1 | tail -10
log_success "Vercel deploy startet!"
echo ""

# Steg 7: Verifikasjon
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ VERIFIKASJON"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

log_info "Sjekker deploy status..."
sleep 5

# Sjekk Vercel deploy status
echo ""
echo "Vercel Deploys:"
npx vercel ls --token "$VERCEL_TOKEN" 2>&1 | head -5

echo ""
echo "Supabase Edge Functions:"
supabase functions list 2>&1 | tail -10

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🎉 AUTO DEPLOY FULLFØRT!                                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🔗 URLs:"
echo "   Production: https://www.klarpakke.no"
echo "   Supabase:   https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf"
echo ""
echo "Neste steg:"
echo "   • Sjekk Vercel dashboard for deploy status"
echo "   • Test funksjonalitet på www.klarpakke.no"
echo ""
