#!/bin/bash
set -euo pipefail

# =============================================================================
# Environment Sync Script for Klarpakke
# Synkroniserer miljøvariabler til Cloudflare og GitHub Actions
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

# Sjekk at .env.local finnes
if [ ! -f ".env.local" ]; then
    log_error ".env.local finnes ikke. Kopier fra .env.local.example og fyll inn verdier."
    exit 1
fi

log_info "Leser miljøvariabler fra .env.local..."

# Les nødvendige variabler fra .env.local
SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d'=' -f2- | tr -d '"' || echo "")
SUPABASE_ANON_KEY=$(grep "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local | cut -d'=' -f2- | tr -d '"' || echo "")
STRIPE_PUBLISHABLE_KEY=$(grep "^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=" .env.local | cut -d'=' -f2- | tr -d '"' || echo "")
SITE_URL=$(grep "^NEXT_PUBLIC_SITE_URL=" .env.local | cut -d'=' -f2- | tr -d '"' || echo "")

if [ -z "${SUPABASE_URL}" ] || [ -z "${SUPABASE_ANON_KEY}" ]; then
    log_error "Mangler kritiske variabler i .env.local (SUPABASE_URL eller SUPABASE_ANON_KEY)"
    exit 1
fi

log_success "Variabler lest fra .env.local"

# =============================================================================
# Cloudflare Pages Env Vars
# =============================================================================

if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
    log_info "Synkroniserer til Cloudflare Pages..."
    
    PROJECT_NAME="${CLOUDFLARE_PAGES_PROJECT_NAME:-klarpakke}"
    
    # Bruk wrangler for å sette secrets (mer pålitelig enn API)
    log_info "Setter miljøvariabler via wrangler..."
    
    # Publiserbare variabler (ikke hemmelige)
    echo "${SUPABASE_URL}" | npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL --project-name="${PROJECT_NAME}" 2>/dev/null || {
        log_warn "Kunne ikke sette NEXT_PUBLIC_SUPABASE_URL (kan allerede eksistere)"
    }
    
    echo "${SUPABASE_ANON_KEY}" | npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --project-name="${PROJECT_NAME}" 2>/dev/null || {
        log_warn "Kunne ikke sette NEXT_PUBLIC_SUPABASE_ANON_KEY (kan allerede eksistere)"
    }
    
    if [ -n "${STRIPE_PUBLISHABLE_KEY}" ]; then
        echo "${STRIPE_PUBLISHABLE_KEY}" | npx wrangler pages secret put NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY --project-name="${PROJECT_NAME}" 2>/dev/null || {
            log_warn "Kunne ikke sette NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
        }
    fi
    
    if [ -n "${SITE_URL}" ]; then
        echo "${SITE_URL}" | npx wrangler pages secret put NEXT_PUBLIC_SITE_URL --project-name="${PROJECT_NAME}" 2>/dev/null || {
            log_warn "Kunne ikke sette NEXT_PUBLIC_SITE_URL"
        }
    fi
    
    log_success "Cloudflare Pages miljøvariabler synkronisert"
else
    log_warn "CLOUDFLARE_API_TOKEN eller CLOUDFLARE_ACCOUNT_ID ikke satt - hopper over Cloudflare sync"
fi

# =============================================================================
# GitHub Actions Secrets
# =============================================================================

if command -v glab &> /dev/null; then
    log_info "Synkroniserer til GitHub Actions..."
    
    # Funksjon for å sette eller oppdatere GitHub secret
    set_gitlab_var() {
        local key="$1"
        local value="$2"
        local masked="${3:-false}"
        
        # Sjekk om variabelen allerede eksisterer
        if glab variable get "${key}" &>/dev/null; then
            log_info "Oppdaterer eksisterende GitHub secret: ${key}"
            glab variable update "${key}" --value="${value}" $( [ "${masked}" == "true" ] && echo "--masked" ) || {
                log_warn "Kunne ikke oppdatere ${key}"
            }
        else
            log_info "Oppretter ny GitHub secret: ${key}"
            glab variable set "${key}" --value="${value}" $( [ "${masked}" == "true" ] && echo "--masked" ) || {
                log_warn "Kunne ikke sette ${key}"
            }
        fi
    }
    
    # Sett variabler
    set_gitlab_var "NEXT_PUBLIC_SUPABASE_URL" "${SUPABASE_URL}" "false"
    set_gitlab_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "${SUPABASE_ANON_KEY}" "true"
    
    if [ -n "${STRIPE_PUBLISHABLE_KEY}" ]; then
        set_gitlab_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "${STRIPE_PUBLISHABLE_KEY}" "true"
    fi
    
    log_success "GitHub Actions secrets synkronisert"
else
    log_warn "gh CLI ikke installert - hopper over GitHub sync"
    log_info "Installer med: brew install glab"
fi

log_success "Miljøsynkronisering fullført!"
