#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# 🤖 KIMI AUTO-PILOT - Automated Vercel Management
# ═══════════════════════════════════════════════════════════════════

set -e

# Load environment from .env.local
if [ -f .env.local ]; then
    export VERCEL_TOKEN=$(grep '^VERCEL_TOKEN=' .env.local | cut -d'=' -f2-)
    export VERCEL_ORG_ID=$(grep '^VERCEL_ORG_ID=' .env.local | cut -d'=' -f2)
    export VERCEL_PROJECT_ID=$(grep '^VERCEL_PROJECT_ID=' .env.local | cut -d'=' -f2)
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[AUTO-PILOT]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

# ═══════════════════════════════════════════════════════════════════
# COMMANDS
# ═══════════════════════════════════════════════════════════════════

cmd_status() {
    log "System Status Check"
    echo ""
    
    # Vercel auth
    VERCEL_USER=$(npx vercel whoami 2>/dev/null || echo "")
    if [ "$VERCEL_USER" = "tombomann" ]; then
        success "Vercel: Autentisert som $VERCEL_USER"
    else
        error "Vercel: Ikke autentisert"
        return 1
    fi
    
    # Latest deploy
    log "Siste deploy:"
    npx vercel list 2>/dev/null | grep -E "(Age|● Ready|Canceled)" | head -5
    
    # Production health
    echo ""
    log "Produksjonssjekk:"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://www.klarpakke.no)
    if [ "$HTTP_STATUS" = "200" ]; then
        success "www.klarpakke.no: HTTP $HTTP_STATUS"
    else
        error "www.klarpakke.no: HTTP $HTTP_STATUS"
    fi
    
    # Git status
    echo ""
    log "Git status:"
    git log --oneline -3
    
    echo ""
    success "Status check complete"
}

cmd_verify() {
    log "Running Full Verification"
    npm run verify
}

cmd_deploy() {
    log "Deploying to Production"
    
    # Pre-deploy checks
    log "Pre-deploy checks..."
    npm run lint || { error "Lint failed"; exit 1; }
    npm run type-check || { error "Type check failed"; exit 1; }
    npm run test:unit || { error "Tests failed"; exit 1; }
    
    # Build
    log "Building..."
    npm run build || { error "Build failed"; exit 1; }
    
    # Deploy
    log "Deploying to Vercel..."
    npx vercel --prod --yes
    
    # Verify
    log "Verifying deployment..."
    sleep 10
    npm run verify
    
    success "Deploy complete!"
}

cmd_logs() {
    log "Fetching Vercel Logs"
    npx vercel logs --json 2>/dev/null | head -50
}

cmd_env() {
    log "Environment Variables"
    npx vercel env ls
}

cmd_help() {
    cat << 'EOF'
🤖 KIMI AUTO-PILOT - Available Commands

Usage: ./.kimi/auto-pilot.sh [command]

Commands:
  status    - Check system status (Vercel, Git, Health)
  verify    - Run full production verification
  deploy    - Deploy to production (lint, test, build, deploy, verify)
  logs      - Show recent Vercel logs
  env       - List environment variables
  help      - Show this help

Examples:
  ./.kimi/auto-pilot.sh status
  ./.kimi/auto-pilot.sh deploy

EOF
}

# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════

COMMAND=${1:-status}

case "$COMMAND" in
    status)
        cmd_status
        ;;
    verify)
        cmd_verify
        ;;
    deploy)
        cmd_deploy
        ;;
    logs)
        cmd_logs
        ;;
    env)
        cmd_env
        ;;
    help|--help|-h)
        cmd_help
        ;;
    *)
        error "Unknown command: $COMMAND"
        cmd_help
        exit 1
        ;;
esac
