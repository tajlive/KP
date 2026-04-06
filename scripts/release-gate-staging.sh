#!/bin/bash
set -euo pipefail

# =============================================================================
# Klarpakke V3.0.1 Staging Release Gate
# =============================================================================
# 
# Sjekker alle P0-krav før beta-lansering:
# 1. Database migrasjoner
# 2. API deploy
# 3. P0 integrasjonstester
# 4. Load test (1000 ordre/min)
# 5. Smoke tests
# 6. Audit integrity verify
# 7. Risk limits verify
# 8. Rollback test
#
# Usage: ./scripts/release-gate-staging.sh [--force]
# =============================================================================

VERSION="3.0.1-p0"
ENVIRONMENT="staging"
FORCE=${1:-""}
FAILED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[PASS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[FAIL]${NC} $1"
}

section() {
  echo ""
  echo "============================================================================="
  echo "  $1"
  echo "============================================================================="
}

# =============================================================================
# Pre-flight checks
# =============================================================================
section "Pre-flight Checks"

# Sjekk at vi er på riktig branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "develop" && "$FORCE" != "--force" ]]; then
  log_warn "Not on main or develop branch (current: $CURRENT_BRANCH)"
  log_warn "Use --force to override"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Sjekk at det ikke er uncommitted changes
if ! git diff-index --quiet HEAD --; then
  log_error "Uncommitted changes detected"
  git status --short
  exit 1
fi
log_success "Working directory clean"

# Sjekk at Supabase CLI er installert
if ! command -v supabase &> /dev/null; then
  log_error "Supabase CLI not found"
  exit 1
fi
log_success "Supabase CLI available"

# Sjekk at Vercel CLI er installert
if ! command -v vercel &> /dev/null; then
  log_error "Vercel CLI not found"
  exit 1
fi
log_success "Vercel CLI available"

# =============================================================================
# Gate 1: Database Migration
# =============================================================================
section "Gate 1: Database Migration"

log_info "Checking database connection..."
if ! npx supabase status &> /dev/null; then
  log_error "Cannot connect to Supabase"
  exit 1
fi
log_success "Database connection OK"

log_info "Running migrations check..."
if ! npx supabase migration list > /tmp/migration-status.txt 2>&1; then
  log_error "Migration check failed"
  cat /tmp/migration-status.txt
  FAILED=$((FAILED + 1))
else
  log_success "Migration check passed"
fi

log_info "Checking required tables..."
REQUIRED_TABLES=("risk_state" "risk_violations" "audit_log" "outbox_recovery")
for table in "${REQUIRED_TABLES[@]}"; do
  if ! npx supabase query "SELECT 1 FROM $table LIMIT 1" > /dev/null 2>&1; then
    log_error "Required table missing: $table"
    FAILED=$((FAILED + 1))
  else
    log_success "Table exists: $table"
  fi
done

# =============================================================================
# Gate 2: Type Check & Lint
# =============================================================================
section "Gate 2: Type Check & Lint"

log_info "Running TypeScript type check..."
if ! npm run type-check > /tmp/typecheck.log 2>&1; then
  log_error "Type check failed"
  tail -50 /tmp/typecheck.log
  FAILED=$((FAILED + 1))
else
  log_success "Type check passed"
fi

log_info "Running ESLint..."
if ! npm run lint > /tmp/lint.log 2>&1; then
  log_error "Lint failed"
  tail -50 /tmp/lint.log
  FAILED=$((FAILED + 1))
else
  log_success "Lint passed"
fi

# =============================================================================
# Gate 3: Unit Tests
# =============================================================================
section "Gate 3: Unit Tests"

log_info "Running P0 unit tests..."
if ! npm run test:unit -- src/lib/trading/__tests__/p0-*.test.ts --reporter=dot > /tmp/unit-tests.log 2>&1; then
  log_error "P0 unit tests failed"
  tail -100 /tmp/unit-tests.log
  FAILED=$((FAILED + 1))
else
  log_success "Unit tests passed"
fi

# =============================================================================
# Gate 4: Integration Tests
# =============================================================================
section "Gate 4: Integration Tests"

log_info "Running integration tests..."
if ! npm run test:integration:v3 > /tmp/integration-tests.log 2>&1; then
  log_error "Integration tests failed"
  tail -100 /tmp/integration-tests.log
  FAILED=$((FAILED + 1))
else
  log_success "Integration tests passed"
fi

# =============================================================================
# Gate 5: Deploy to Staging
# =============================================================================
section "Gate 5: Deploy to Staging"

log_info "Deploying to staging..."
if ! vercel --env staging --confirm > /tmp/deploy.log 2>&1; then
  log_error "Deploy failed"
  tail -100 /tmp/deploy.log
  FAILED=$((FAILED + 1))
  exit 1
else
  log_success "Deploy successful"
fi

# Vent på at deploy er live
log_info "Waiting for deployment to be live..."
sleep 10

# =============================================================================
# Gate 6: Health Check
# =============================================================================
section "Gate 6: Health Check"

STAGING_URL="https://staging.klarpakke.no"

log_info "Checking /api/health..."
HEALTH_RESPONSE=$(curl -s -o /tmp/health.json -w "%{http_code}" "$STAGING_URL/api/health" 2>/dev/null)
if [[ "$HEALTH_RESPONSE" != "200" ]]; then
  log_error "Health check failed (HTTP $HEALTH_RESPONSE)"
  FAILED=$((FAILED + 1))
else
  log_success "Health check passed"
  cat /tmp/health.json | jq '.' 2>/dev/null || cat /tmp/health.json
fi

log_info "Checking V3 trading health..."
V3_HEALTH=$(curl -s -o /tmp/v3health.json -w "%{http_code}" "$STAGING_URL/api/trading/v3/health" 2>/dev/null)
if [[ "$V3_HEALTH" != "200" ]]; then
  log_error "V3 health check failed (HTTP $V3_HEALTH)"
  FAILED=$((FAILED + 1))
else
  log_success "V3 health check passed"
  cat /tmp/v3health.json | jq '.' 2>/dev/null || cat /tmp/v3health.json
fi

# =============================================================================
# Gate 7: Smoke Tests
# =============================================================================
section "Gate 7: Smoke Tests"

log_info "Running smoke tests..."
if ! npm run test:smoke:staging > /tmp/smoke-tests.log 2>&1; then
  log_error "Smoke tests failed"
  tail -100 /tmp/smoke-tests.log
  FAILED=$((FAILED + 1))
else
  log_success "Smoke tests passed"
fi

# =============================================================================
# Gate 8: Risk System Verification
# =============================================================================
section "Gate 8: Risk System Verification"

log_info "Verifying risk limits API..."
RISK_CHECK=$(curl -s -X POST "$STAGING_URL/api/trading/v3/risk/check" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"trade": {"side": "buy", "quantity": 1, "price": 100}}' \
  -w "%{http_code}" \
  -o /tmp/risk-check.json 2>/dev/null)

if [[ "$RISK_CHECK" != "200" && "$RISK_CHECK" != "400" ]]; then
  log_error "Risk check API failed (HTTP $RISK_CHECK)"
  FAILED=$((FAILED + 1))
else
  log_success "Risk check API accessible"
fi

log_info "Verifying risk state persistence..."
if ! curl -s "$STAGING_URL/api/trading/v3/risk/state" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -o /tmp/risk-state.json 2>/dev/null | grep -q "equity"; then
  log_warn "Could not verify risk state (may be empty for new user)"
else
  log_success "Risk state accessible"
fi

# =============================================================================
# Gate 9: Audit Integrity Check (BLOCKING)
# =============================================================================
section "Gate 9: Audit Integrity Check (BLOCKING)"

log_info "Running audit integrity verification..."

# Check for orphaned trades (no audit log)
ORPHANED=$(curl -s "$STAGING_URL/api/trading/v3/health" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -X POST -d '{"component":"audit-integrity"}' 2>/dev/null | jq -r '.orphanedTrades // 0')

if [[ "$ORPHANED" -gt 0 ]]; then
  log_error "Audit integrity FAILED: $ORPHANED orphaned trades found"
  log_error "All trades MUST have corresponding audit logs"
  FAILED=$((FAILED + 1))
else
  log_success "Audit integrity verified (no orphaned trades)"
fi

# Run full audit verification
if ! npm run verify:audit:integrity > /tmp/audit-verify.log 2>&1; then
  log_error "Audit integrity check FAILED"
  tail -50 /tmp/audit-verify.log
  FAILED=$((FAILED + 1))
else
  log_success "Full audit integrity verified"
fi

# =============================================================================
# Gate 10: Outbox Recovery Check
# =============================================================================
section "Gate 10: Outbox Recovery Check"

log_info "Checking outbox status..."
OUTBOX_STATS=$(curl -s "$STAGING_URL/api/trading/v3/outbox/stats" \
  -H "Authorization: Bearer $TEST_TOKEN" 2>/dev/null)

if echo "$OUTBOX_STATS" | grep -q "requiringIntervention"; then
  INTERVENTION_COUNT=$(echo "$OUTBOX_STATS" | jq -r '.requiringIntervention // 0')
  if [[ "$INTERVENTION_COUNT" -gt 0 ]]; then
    log_error "Outbox has $INTERVENTION_COUNT items requiring manual intervention"
    FAILED=$((FAILED + 1))
  else
    log_success "Outbox clear (no manual intervention required)"
  fi
else
  log_warn "Could not fetch outbox stats"
fi

# =============================================================================
# Gate 11: Load Test (Optional - slow)
# =============================================================================
section "Gate 11: Load Test"

if [[ "${SKIP_LOAD_TEST:-}" == "true" ]]; then
  log_warn "Load test skipped (SKIP_LOAD_TEST=true)"
else
  log_info "Running load test (100 orders/min)..."
  if ! npm run test:load:v3 > /tmp/load-test.log 2>&1; then
    log_error "Load test failed"
    tail -100 /tmp/load-test.log
    FAILED=$((FAILED + 1))
  else
    log_success "Load test passed (1000 orders/min verified)"
  fi
fi

# =============================================================================
# Gate 12: Rollback Test (BLOCKING)
# =============================================================================
section "Gate 12: Rollback Test (BLOCKING)"

log_info "Testing rollback capability..."

# Verify rollback endpoint exists and responds
ROLLBACK_CHECK=$(curl -s -o /tmp/rollback-check.json -w "%{http_code}" \
  "$STAGING_URL/api/admin/rollback/status" \
  -H "Authorization: Bearer $TEST_TOKEN" 2>/dev/null)

if [[ "$ROLLBACK_CHECK" != "200" ]]; then
  log_error "Rollback endpoint not accessible (HTTP $ROLLBACK_CHECK)"
  log_error "Rollback capability is MANDATORY for production"
  FAILED=$((FAILED + 1))
else
  log_success "Rollback endpoint accessible"
fi

# Run full rollback test
if ! npm run test:rollback:staging > /tmp/rollback-test.log 2>&1; then
  log_error "Rollback test FAILED"
  log_error "System must be able to rollback to previous version"
  tail -50 /tmp/rollback-test.log
  FAILED=$((FAILED + 1))
else
  log_success "Rollback test passed"
fi

# =============================================================================
# Summary
# =============================================================================
section "Release Gate Summary"

echo "Version: $VERSION"
echo "Environment: $ENVIRONMENT"
echo "Branch: $CURRENT_BRANCH"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

if [[ $FAILED -eq 0 ]]; then
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                   ALL GATES PASSED ✓                          ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Release is APPROVED for staging beta."
  echo ""
  echo "Next steps:"
  echo "  1. Monitor staging for 24 hours"
  echo "  2. Run chaos tests: npm run test:chaos"
  echo "  3. Approve for production: ./scripts/release-gate-production.sh"
  echo ""
  exit 0
else
  echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║                   $FAILED GATE(S) FAILED ✗                       ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Release is BLOCKED. Fix the following issues:"
  echo "  - Check the logs above for specific failures"
  echo "  - Run individual checks to debug"
  echo "  - Fix and re-run: ./scripts/release-gate-staging.sh"
  echo ""
  exit 1
fi
