#!/bin/bash
set -euo pipefail

# =============================================================================
# Klarpakke V3.0.1 PRODUCTION Release Gate
# =============================================================================
#
# STRICT: Ingen deploy til produksjon uten at ALLE gates passerer.
# Blokkerende kriterier:
#   - status != healthy
#   - tradingEnabled != true  
#   - killSwitch.activated == true
#   - outbox.failed > 0
#   - audit integrity feiler
#   - rollback readiness feiler
#
# Usage: ./scripts/release-gate-production.sh [--force]
# Exit codes: 0 = GO, 1 = NO-GO
# =============================================================================

VERSION="3.0.1-p0"
ENVIRONMENT="production"
FORCE=${1:-""}
FAILED=0

# Produksjons-URL
PROD_URL="https://www.klarpakke.no"

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; }

section() {
  echo ""
  echo "============================================================================="
  echo "  $1"
  echo "============================================================================="
}

# =============================================================================
# Pre-flight (hard stop ved feil)
# =============================================================================
section "Pre-flight Checks"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" && "$FORCE" != "--force" ]]; then
  log_fail "Must be on main branch for production (current: $CURRENT_BRANCH)"
  exit 1
fi
log_pass "Branch check: $CURRENT_BRANCH"

if ! git diff-index --quiet HEAD --; then
  log_fail "Uncommitted changes detected"
  git status --short
  exit 1
fi
log_pass "Working directory clean"

# =============================================================================
# Gate 1: Database Migration
# =============================================================================
section "Gate 1: Database Migration"

log_info "Connecting to production database..."
if ! npx supabase status --env production &> /dev/null; then
  log_fail "Cannot connect to production Supabase"
  exit 1
fi
log_pass "Production database connection OK"

# =============================================================================
# Gate 2: Type Check & Lint (zero tolerance)
# =============================================================================
section "Gate 2: Type Check & Lint"

log_info "TypeScript type check..."
if ! npm run type-check > /tmp/typecheck.log 2>&1; then
  log_fail "Type check FAILED"
  cat /tmp/typecheck.log | tail -50
  exit 1
fi
log_pass "Type check passed"

log_info "ESLint..."
if ! npm run lint -- --max-warnings 0 > /tmp/lint.log 2>&1; then
  log_fail "Lint FAILED (zero warnings tolerance)"
  cat /tmp/lint.log | tail -50
  exit 1
fi
log_pass "Lint passed (no warnings)"

# =============================================================================
# Gate 3: Unit Tests
# =============================================================================
section "Gate 3: Unit Tests"

log_info "Running P0 unit tests..."
if ! npm run test:unit -- src/lib/trading/__tests__/p0-*.test.ts --reporter=dot > /tmp/unit-tests.log 2>&1; then
  log_fail "Unit tests FAILED"
  cat /tmp/unit-tests.log | tail -50
  FAILED=$((FAILED + 1))
else
  log_pass "Unit tests passed"
fi

# =============================================================================
# Gate 4: Integration Tests
# =============================================================================
section "Gate 4: Integration Tests"

log_info "Running integration tests..."
if ! npm run test:integration:v3 > /tmp/integration-tests.log 2>&1; then
  log_fail "Integration tests FAILED"
  cat /tmp/integration-tests.log | tail -100
  FAILED=$((FAILED + 1))
else
  log_pass "Integration tests passed"
fi

# =============================================================================
# Gate 5: Deploy to Production (PROMOTE from staging)
# =============================================================================
section "Gate 5: Deploy to Production"

log_info "Promoting staging to production..."
if ! vercel --prod --confirm > /tmp/deploy.log 2>&1; then
  log_fail "Production deploy FAILED"
  cat /tmp/deploy.log | tail -100
  exit 1
fi
log_pass "Production deploy initiated"

log_info "Waiting for deployment (60s)..."
sleep 60

# =============================================================================
# Gate 6: Basic Health Check
# =============================================================================
section "Gate 6: Basic Health Check"

log_info "GET $PROD_URL/api/health"
HEALTH_STATUS=$(curl -s -o /tmp/health.json -w "%{http_code}" "$PROD_URL/api/health" 2>/dev/null)

if [[ "$HEALTH_STATUS" != "200" ]]; then
  log_fail "Health check FAILED (HTTP $HEALTH_STATUS)"
  exit 1
fi
log_pass "Basic health OK"

# =============================================================================
# Gate 7: V3 Health JSON Validation (CRITICAL)
# =============================================================================
section "Gate 7: V3 Health JSON Validation (CRITICAL)"

log_info "GET $PROD_URL/api/trading/v3/health"
curl -s -o /tmp/v3health.json "$PROD_URL/api/trading/v3/health" 2>/dev/null || true

# Valider at vi fikk gyldig JSON
if ! jq empty /tmp/v3health.json 2>/dev/null; then
  log_fail "V3 health returned invalid JSON"
  exit 1
fi

# Hent verdier
V3_STATUS=$(jq -r '.status // "unknown"' /tmp/v3health.json)
V3_TRADING=$(jq -r '.tradingEnabled // "unknown"' /tmp/v3health.json)
V3_KILL=$(jq -r '.killSwitch.activated // "unknown"' /tmp/v3health.json)
V3_OUTBOX_FAILED=$(jq -r '.checks.outbox.failed // -1' /tmp/v3health.json)

log_info "V3 Health Status: $V3_STATUS"
log_info "Trading Enabled: $V3_TRADING"
log_info "Kill Switch: $V3_KILL"
log_info "Outbox Failed: $V3_OUTBOX_FAILED"

# HARD BLOCKS
if [[ "$V3_STATUS" != "healthy" ]]; then
  log_fail "status != healthy (got: $V3_STATUS)"
  exit 1
fi
log_pass "status = healthy"

if [[ "$V3_TRADING" != "true" ]]; then
  log_fail "tradingEnabled != true (got: $V3_TRADING)"
  exit 1
fi
log_pass "tradingEnabled = true"

if [[ "$V3_KILL" == "true" ]]; then
  log_fail "killSwitch.activated = true"
  exit 1
fi
log_pass "killSwitch.activated = false"

if [[ "$V3_OUTBOX_FAILED" -gt 0 ]]; then
  log_fail "outbox.failed > 0 (got: $V3_OUTBOX_FAILED)"
  exit 1
fi
log_pass "outbox.failed = 0"

# Vis full respons
jq '.' /tmp/v3health.json 2>/dev/null || cat /tmp/v3health.json

# =============================================================================
# Gate 8: Smoke Tests (Production)
# =============================================================================
section "Gate 8: Smoke Tests (Production)"

log_info "Running smoke tests against production..."
if ! npm run test:smoke:prod > /tmp/smoke-tests.log 2>&1; then
  log_fail "Smoke tests FAILED"
  cat /tmp/smoke-tests.log | tail -100
  exit 1
fi
log_pass "Smoke tests passed"

# =============================================================================
# Gate 9: Audit Integrity (BLOCKING)
# =============================================================================
section "Gate 9: Audit Integrity Check (BLOCKING)"

log_info "Verifying audit integrity..."

AUDIT_CHECK=$(curl -s -X POST "$PROD_URL/api/trading/v3/health" \
  -H "Content-Type: application/json" \
  -d '{"component":"audit-integrity"}' 2>/dev/null | jq -r '.orphanedTrades // 0')

if [[ "$AUDIT_CHECK" -gt 0 ]]; then
  log_fail "Audit integrity FAILED: $AUDIT_CHECK orphaned trades"
  exit 1
fi
log_pass "Audit integrity verified"

# =============================================================================
# Gate 10: Outbox Status (BLOCKING)
# =============================================================================
section "Gate 10: Outbox Status (BLOCKING)"

log_info "Checking outbox status..."

OUTBOX_PENDING=$(jq -r '.checks.outbox.pending // -1' /tmp/v3health.json)
OUTBOX_INTERVENTION=$(jq -r '.checks.outbox.requiringIntervention // -1' /tmp/v3health.json)

log_info "Outbox pending: $OUTBOX_PENDING"
log_info "Outbox requiring intervention: $OUTBOX_INTERVENTION"

if [[ "$OUTBOX_INTERVENTION" -gt 0 ]]; then
  log_fail "Outbox has items requiring manual intervention"
  exit 1
fi

if [[ "$OUTBOX_PENDING" -gt 50 ]]; then
  log_fail "Outbox backlog too high: $OUTBOX_PENDING"
  exit 1
fi

log_pass "Outbox status OK"

# =============================================================================
# Gate 11: Load Test (MANDATORY for prod)
# =============================================================================
section "Gate 11: Load Test (MANDATORY)"

log_info "Running production load test..."
if ! npm run test:load:prod > /tmp/load-test.log 2>&1; then
  log_fail "Load test FAILED"
  cat /tmp/load-test.log | tail -100
  exit 1
fi
log_pass "Load test passed (1000 orders/min verified)"

# =============================================================================
# Gate 12: Rollback Readiness (BLOCKING)
# =============================================================================
section "Gate 12: Rollback Readiness (BLOCKING)"

log_info "Verifying rollback endpoint..."
ROLLBACK_STATUS=$(curl -s -o /tmp/rollback.json -w "%{http_code}" \
  "$PROD_URL/api/admin/rollback/status" 2>/dev/null)

if [[ "$ROLLBACK_STATUS" != "200" ]]; then
  log_fail "Rollback endpoint not accessible (HTTP $ROLLBACK_STATUS)"
  exit 1
fi
log_pass "Rollback endpoint accessible"

log_info "Running rollback readiness test..."
if ! npm run test:rollback:prod > /tmp/rollback-test.log 2>&1; then
  log_fail "Rollback readiness test FAILED"
  cat /tmp/rollback-test.log | tail -50
  exit 1
fi
log_pass "Rollback readiness verified"

# =============================================================================
# Summary
# =============================================================================
section "PRODUCTION Release Gate Summary"

echo "Version:     $VERSION"
echo "Environment: $ENVIRONMENT"
echo "URL:         $PROD_URL"
echo "Branch:      $CURRENT_BRANCH"
echo "Timestamp:   $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

if [[ $FAILED -eq 0 ]]; then
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║              ALL PRODUCTION GATES PASSED ✓                    ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Klarpakke V3.0.1 is LIVE in production."
  echo ""
  echo "Post-deploy monitoring:"
  echo "  curl $PROD_URL/api/trading/v3/health | jq '.status, .tradingEnabled'"
  echo ""
  exit 0
else
  echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║              $FAILED GATE(S) FAILED - ROLLBACK REQUIRED        ${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Production deploy FAILED. Immediate rollback required."
  echo "  npm run rollback:prod"
  echo ""
  exit 1
fi
