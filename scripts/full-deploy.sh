#!/usr/bin/env bash
# =============================================================================
# FULL DEPLOY - Komplett deploy-kjede for Klarpakke
# =============================================================================
# Dette scriptet:
# 1. Kjører migrasjons-fix scripts
# 2. Pusher migrasjoner til Supabase
# 3. Verifiserer type-check og bygg
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Farger for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
  echo -e "${YELLOW}⚠️ $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

# =============================================================================
# STEP 0: Pre-flight sjekker
# =============================================================================
echo ""
echo "============================================================================="
log_info "KLARPAKKE FULL DEPLOY - Starter..."
echo "============================================================================="
echo ""

# Sjekk at vi er i riktig directory
cd "$PROJECT_ROOT"

# Sjekk at Supabase CLI er installert
if ! command -v supabase &> /dev/null; then
  log_error "Supabase CLI er ikke installert"
  echo "Installer med: brew install supabase/tap/supabase"
  exit 1
fi

# Sjekk at node_modules finnes
if [ ! -d "node_modules" ]; then
  log_warn "node_modules mangler - kjører npm ci..."
  npm ci --legacy-peer-deps
fi

# =============================================================================
# STEP 1: Kjør migrasjons-fix scripts
# =============================================================================
echo ""
echo "============================================================================="
log_info "STEP 1: Kjører migrasjons-fix scripts..."
echo "============================================================================="

# Fix leaderboard migrasjon (hvis finnes)
if [ -f "$SCRIPT_DIR/fix-migration-leaderboard.sh" ]; then
  log_info "Kjører fix-migration-leaderboard.sh..."
  bash "$SCRIPT_DIR/fix-migration-leaderboard.sh" || {
    log_warn "fix-migration-leaderboard.sh returnerte ikke-0, fortsetter..."
  }
else
  log_warn "fix-migration-leaderboard.sh ikke funnet, hopper over"
fi

# Fix courses migrasjon (hvis finnes)
if [ -f "$SCRIPT_DIR/fix-migration-courses.sh" ]; then
  log_info "Kjører fix-migration-courses.sh..."
  bash "$SCRIPT_DIR/fix-migration-courses.sh" || {
    log_warn "fix-migration-courses.sh returnerte ikke-0, fortsetter..."
  }
else
  log_warn "fix-migration-courses.sh ikke funnet, hopper over"
fi

# Kjør andre fix-scripts automatisk
for fix_script in "$SCRIPT_DIR"/fix-migration-*.sh; do
  if [ -f "$fix_script" ] && \
     [ "$fix_script" != "$SCRIPT_DIR/fix-migration-leaderboard.sh" ] && \
     [ "$fix_script" != "$SCRIPT_DIR/fix-migration-courses.sh" ]; then
    log_info "Kjører $(basename "$fix_script")..."
    bash "$fix_script" || {
      log_warn "$(basename "$fix_script") returnerte ikke-0, fortsetter..."
    }
  fi
done

log_success "Migrasjons-fix scripts fullført"

# =============================================================================
# STEP 2: Push migrasjoner til Supabase
# =============================================================================
echo ""
echo "============================================================================="
log_info "STEP 2: Pusher migrasjoner til Supabase..."
echo "============================================================================="

# Sjekk at prosjektet er linket
if [ ! -f "$PROJECT_ROOT/supabase/.temp/project-ref" ]; then
  log_warn "Supabase prosjekt ikke linket - forsøker å linke..."
  
  # Prøv å finne prosjekt-ref fra config.toml
  if [ -f "$PROJECT_ROOT/supabase/config.toml" ]; then
    PROJECT_REF=$(grep -E "^project_id" "$PROJECT_ROOT/supabase/config.toml" | sed 's/.*= *"\([^"]*\)".*/\1/')
    if [ -n "$PROJECT_REF" ]; then
      log_info "Linker til prosjekt: $PROJECT_REF"
      supabase link --project-ref "$PROJECT_REF"
    fi
  fi
fi

# Kjør db push
log_info "Kjører supabase db push..."
supabase db push --include-all || {
  log_error "supabase db push feilet"
  log_info "Sjekk migrasjonsstatus med: supabase migration list"
  exit 1
}

log_success "Migrasjoner pushet til Supabase"

# =============================================================================
# STEP 3: TypeScript type-check
# =============================================================================
echo ""
echo "============================================================================="
log_info "STEP 3: Kjører TypeScript type-check..."
echo "============================================================================="

npm run type-check || {
  log_error "TypeScript type-check feilet"
  log_info "Fiks type-feilene før deploy"
  exit 1
}

log_success "TypeScript type-check OK"

# =============================================================================
# STEP 4: Build
# =============================================================================
echo ""
echo "============================================================================="
log_info "STEP 4: Kjører build..."
echo "============================================================================="

npm run build || {
  log_error "Build feilet"
  exit 1
}

log_success "Build OK"

# =============================================================================
# STEP 5: Oppsummering
# =============================================================================
echo ""
echo "============================================================================="
log_success "FULL DEPLOY CHAIN FULLFØRT!"
echo "============================================================================="
echo ""
log_info "Status:"
echo "  ✅ Migrasjoner pushet til Supabase"
echo "  ✅ TypeScript type-check OK"
echo "  ✅ Build OK"
echo ""
log_info "Neste steg:"
echo "  1. Git push origin main (triggere Cloudflare Pages deploy)"
echo "  2. Vent på at Cloudflare bygger og deployer"
echo "  3. Verifiser med: bash scripts/verify-production.sh"
echo ""
log_info "Verifiser migrasjonsstatus:"
echo "  supabase migration list"
echo ""
echo "============================================================================="
