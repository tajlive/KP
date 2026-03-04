#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# KLARPAKKE CI/CD AUTOMATION
# Full pipeline: DB → Build → Deploy → Test
# ============================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_step() {
  echo -e "${BLUE}┌─ $1${NC}"
}

log_ok() {
  echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
  echo -e "${RED}✗ $1${NC}"
}

log_warn() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# ============================================================
# PHASE 1: Validate Environment
# ============================================================
log_step "PHASE 1: Validate Environment"
echo ""

if [[ ! -f ".env.local" ]]; then
  log_error ".env.local not found"
  exit 1
fi

source .env.local

if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]] || [[ -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
  log_error "Supabase environment variables missing"
  exit 1
fi

log_ok "Supabase keys loaded"

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  log_warn "SUPABASE_DB_URL not set - database migrations will be skipped"
  SKIP_DB=true
else
  SKIP_DB=false
  log_ok "SUPABASE_DB_URL is set"
fi

echo ""

# ============================================================
# PHASE 2: Database Migrations (Optional)
# ============================================================
if [[ "$SKIP_DB" != "true" ]]; then
  log_step "PHASE 2: Database Migrations"
  echo ""

  if bash scripts/supabase/apply-migrations.sh; then
    log_ok "Database migrations applied"
  else
    log_error "Database migrations failed"
    exit 1
  fi
  echo ""
fi

# ============================================================
# PHASE 3: Type Check
# ============================================================
log_step "PHASE 3: Type Check"
echo ""

if npm run type-check; then
  log_ok "Type check passed"
else
  log_error "Type check failed"
  exit 1
fi
echo ""

# ============================================================
# PHASE 4: Build Static Export
# ============================================================
log_step "PHASE 4: Build Static Export"
echo ""

if npm run build; then
  log_ok "Build completed"
else
  log_error "Build failed"
  exit 1
fi
echo ""

# ============================================================
# PHASE 5: Deploy to Cloudflare Pages
# ============================================================
if [[ "${DEPLOY:-false}" == "true" ]]; then
  log_step "PHASE 5: Deploy to Cloudflare Pages"
  echo ""

  if command -v wrangler >/dev/null 2>&1; then
    if wrangler pages deploy out/ --project-name=klarpakke --branch main; then
      log_ok "Deployed to Cloudflare Pages"
    else
      log_error "Cloudflare deployment failed"
      exit 1
    fi
  else
    log_warn "wrangler not found - skipping deployment"
  fi
  echo ""
fi

# ============================================================
# PHASE 6: E2E Tests
# ============================================================
if [[ "${TEST:-false}" == "true" ]]; then
  log_step "PHASE 6: E2E Tests"
  echo ""

  if [[ -f "scripts/tests/beta-apply-e2e.mjs" ]]; then
    if node scripts/tests/beta-apply-e2e.mjs; then
      log_ok "E2E tests passed"
    else
      log_error "E2E tests failed"
      exit 1
    fi
  else
    log_warn "Beta E2E test not found - skipping"
  fi
  echo ""
fi

# ============================================================
# Summary
# ============================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   CI/CD PIPELINE COMPLETE                                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ All phases completed successfully${NC}"
echo ""
echo "Next steps:"
echo "  1. Test locally:     DEPLOY=false TEST=true npm run ci-build"
echo "  2. Deploy:           DEPLOY=true TEST=false npm run ci-build"
echo "  3. Full pipeline:    DEPLOY=true TEST=true npm run ci-build"
echo ""
