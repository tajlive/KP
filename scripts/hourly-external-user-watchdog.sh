#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# KLARPAKKE — Hourly External User Watchdog
# ═══════════════════════════════════════════════════════════════════════════════
# Formål: Timebasert full test av alle kritiske sider med eksterne testbrukere,
#         verifisere at resultater, signaler og trader faktisk fungerer.
#
# Bruk:
#   bash scripts/hourly-external-user-watchdog.sh                    # Standard kjøring
#   bash scripts/hourly-external-user-watchdog.sh --skip-provision   # Hopp over provision
#   bash scripts/hourly-external-user-watchdog.sh --production       # Kjør mot produksjon
#   bash scripts/hourly-external-user-watchdog.sh --slack-url=URL    # Send til annen Slack
#
# Env (valgfri override):
#   WATCHDOG_SLACK_WEBHOOK_URL — override slack-webhook
#   WATCHDOG_REPORT_DIR — hvor rapporter lagres (default: ./watchdog-reports)
#   WATCHDOG_FAIL_FAST — exit 1 ved første feil (default: 1)
#   TEST_USER_EMAIL / TEST_USER_PASSWORD — testbruker (default: tom@klarpakke.no)
#   PLAYWRIGHT_TEST_BASE_URL — override URL (default: http://localhost:3000)
#
# Krever:
#   - .env.local med SUPABASE_SERVICE_ROLE_KEY
#   - npm install (Playwright, dependencies)
#   - Playwright browsere: npx playwright install chromium firefox
#
# Exit codes:
#   0 — alle sjekker OK
#   1 — én eller flere sjekker feilet
#   2 — env/miljø ikke konfigurert riktig
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail
cd "$(dirname "$0")/.."

# ═══════════════════════════════════════════════════════════════════════════════
# KONFIGURASJON
# ═══════════════════════════════════════════════════════════════════════════════

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE_PREFIX=$(date -u +"%Y%m%d-%H%M%S")
REPORT_DIR="${WATCHDOG_REPORT_DIR:-./watchdog-reports}"
REPORT_FILE="$REPORT_DIR/watchdog-$DATE_PREFIX.json"
SUMMARY_FILE="$REPORT_DIR/watchdog-latest.json"
LOG_FILE="$REPORT_DIR/watchdog-$DATE_PREFIX.log"

# Default testbruker (samme som E2E)
TEST_USER_EMAIL="${TEST_USER_EMAIL:-tom@klarpakke.no}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-TestPassword123!}"
E2E_USER_EMAIL="${E2E_USER_EMAIL:-$TEST_USER_EMAIL}"
E2E_USER_PASSWORD="${E2E_USER_PASSWORD:-$TEST_USER_PASSWORD}"

# URL-basert på modus
PRODUCTION_MODE=0
SKIP_PROVISION=0
SLACK_URL="${WATCHDOG_SLACK_WEBHOOK_URL:-${SLACK_WEBHOOK_URL:-}}"
FAIL_FAST="${WATCHDOG_FAIL_FAST:-1}"

# Parse args
for arg in "$@"; do
  case "$arg" in
    --production)
      PRODUCTION_MODE=1
      PLAYWRIGHT_TEST_BASE_URL="${PLAYWRIGHT_TEST_BASE_URL:-https://www.klarpakke.no}"
      ;;
    --skip-provision)
      SKIP_PROVISION=1
      ;;
    --slack-url=*)
      SLACK_URL="${arg#*=}"
      ;;
    --fail-fast=*)
      FAIL_FAST="${arg#*=}"
      ;;
  esac
done

BASE_URL="${PLAYWRIGHT_TEST_BASE_URL:-http://localhost:3000}"

# ═══════════════════════════════════════════════════════════════════════════════
# HJELPEFUNKSJONER
# ═══════════════════════════════════════════════════════════════════════════════

log() {
  echo "[$(date -u +"%H:%M:%S")] $*" | tee -a "$LOG_FILE"
}

log_section() {
  echo "" | tee -a "$LOG_FILE"
  echo "════════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
  echo "  $1" | tee -a "$LOG_FILE"
  echo "════════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
}

fail() {
  log "❌ FEIL: $1"
  if [[ "$FAIL_FAST" == "1" ]]; then
    send_alert "$1"
    exit 1
  fi
}

ensure_env() {
  if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    # Prøv å laste fra .env.local
    if [[ -f .env.local ]]; then
      export $(grep -E '^(SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_URL)=' .env.local | xargs)
    fi
  fi
  
  if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    log "❌ SUPABASE_SERVICE_ROLE_KEY ikke satt"
    exit 2
  fi
  
  if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]]; then
    log "❌ NEXT_PUBLIC_SUPABASE_URL ikke satt"
    exit 2
  fi
}

send_alert() {
  local message="$1"
  local status="${2:-failed}"
  
  if [[ -z "$SLACK_URL" ]]; then
    log "ℹ️  Ingen Slack webhook konfigurert — hopper over varsel"
    return 0
  fi
  
  local emoji=":ambulance:"
  [[ "$status" == "recovered" ]] && emoji=":white_check_mark:"
  
  local payload=$(cat <<EOF
{
  "channel": "#ops",
  "username": "Klarpakke Watchdog",
  "icon_emoji": "$emoji",
  "attachments": [
    {
      "color": "$([[ "$status" == "recovered" ]] && echo "good" || echo "danger")",
      "title": "$([[ "$status" == "recovered" ]] && echo "✅ Watchdog RECOVERED" || echo "🚨 Watchdog ALERT")",
      "fields": [
        {"title": "Timestamp", "value": "$TIMESTAMP", "short": true},
        {"title": "Miljø", "value": "$([[ "$PRODUCTION_MODE" == "1" ]] && echo "Produksjon" || echo "Lokal/Staging")", "short": true},
        {"title": "URL", "value": "$BASE_URL", "short": true},
        {"title": "Testbruker", "value": "$TEST_USER_EMAIL", "short": true},
        {"title": "Status", "value": "$status", "short": true},
        {"title": "Melding", "value": "$message", "short": false}
      ],
      "footer": "Klarpakke Hourly Watchdog",
      "ts": $(date +%s)
    }
  ]
}
EOF
)
  
  curl -sS -X POST -H "Content-Type: application/json" -d "$payload" "$SLACK_URL" || true
}

# ═══════════════════════════════════════════════════════════════════════════════
# RAPPORTBYGGER
# ═══════════════════════════════════════════════════════════════════════════════

init_report() {
  mkdir -p "$REPORT_DIR"
  cat > "$REPORT_FILE" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "environment": "$([[ "$PRODUCTION_MODE" == "1" ]] && echo "production" || echo "local/staging")",
  "baseUrl": "$BASE_URL",
  "testUser": "$TEST_USER_EMAIL",
  "checks": {},
  "summary": {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "durationMs": 0
  },
  "status": "running"
}
EOF
  cp "$REPORT_FILE" "$SUMMARY_FILE"
}

update_check() {
  local name="$1"
  local status="$2"  # passed/failed/skipped
  local details="${3:-{}}"
  local duration="${4:-0}"
  
  local tmp=$(mktemp)
  jq --arg name "$name" \
     --arg status "$status" \
     --argjson details "$details" \
     --argjson duration "$duration" \
     '.checks[$name] = {status: $status, durationMs: $duration, details: $details}' \
     "$REPORT_FILE" > "$tmp" && mv "$tmp" "$REPORT_FILE"
}

finalize_report() {
  local exit_code="$1"
  local total="${2:-0}"
  local passed="${3:-0}"
  local failed="${4:-0}"
  local duration="${5:-0}"
  
  local final_status="passed"
  [[ "$failed" -gt 0 ]] && final_status="failed"
  [[ "$exit_code" -ne 0 ]] && final_status="failed"
  
  local tmp=$(mktemp)
  jq --argjson total "$total" \
     --argjson passed "$passed" \
     --argjson failed "$failed" \
     --argjson duration "$duration" \
     --arg status "$final_status" \
     '.summary = {total: $total, passed: $passed, failed: $failed, durationMs: $duration} | .status = $status' \
     "$REPORT_FILE" > "$tmp" && mv "$tmp" "$REPORT_FILE"
  
  cp "$REPORT_FILE" "$SUMMARY_FILE"
  
  log ""
  log "📊 RAPPORT: $REPORT_FILE"
  log "    Status: $final_status"
  log "    Passed: $passed / $total"
  log "    Failed: $failed"
  log "    Tid: ${duration}ms"
}

# ═══════════════════════════════════════════════════════════════════════════════
# TESTSTEG
# ═══════════════════════════════════════════════════════════════════════════════

run_step() {
  local name="$1"
  local cmd="$2"
  local start end duration status details
  
  log ""
  log "▶️  $name..."
  start=$(date +%s%N)
  
  if eval "$cmd" >> "$LOG_FILE" 2>&1; then
    end=$(date +%s%N)
    duration=$(( (end - start) / 1000000 ))
    log "   ✅ $name OK (${duration}ms)"
    update_check "$name" "passed" "{}" "$duration"
    return 0
  else
    end=$(date +%s%N)
    duration=$(( (end - start) / 1000000 ))
    log "   ❌ $name FEILET (${duration}ms)"
    update_check "$name" "failed" "{\"error\": \"Se logg for detaljer\"}" "$duration"
    return 1
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

main() {
  local overall_start overall_end overall_duration
  overall_start=$(date +%s%N)
  
  log_section "HOURLY EXTERNAL USER WATCHDOG"
  log "Timestamp: $TIMESTAMP"
  log "Miljø: $([[ "$PRODUCTION_MODE" == "1" ]] && echo "Produksjon" || echo "Lokal/Staging")"
  log "Base URL: $BASE_URL"
  log "Testbruker: $TEST_USER_EMAIL"
  log "Report dir: $REPORT_DIR"
  
  init_report
  ensure_env
  
  local total=0 passed=0 failed=0
  
  # ─────────────────────────────────────────────────────────────────────────────
  # STEG 1: Valider env og testbrukere
  # ─────────────────────────────────────────────────────────────────────────────
  log_section "STEG 1: Validering"
  
  ((total++))
  if run_step "env-check" "node scripts/create-test-users.js --check-env"; then
    ((passed++))
  else
    ((failed++))
    fail "Env-validering feilet"
  fi
  
  # ─────────────────────────────────────────────────────────────────────────────
  # STEG 2: Provision / sjekk eksterne testbrukere
  # ─────────────────────────────────────────────────────────────────────────────
  if [[ "$SKIP_PROVISION" == "0" ]]; then
    log_section "STEG 2: Testbrukere (provision)"
    
    ((total++))
    if run_step "provision-primary" "node scripts/create-test-users.js --primary-only"; then
      ((passed++))
    else
      ((failed++))
      fail "Provision av primær testbruker feilet"
    fi
    
    ((total++))
    if run_step "provision-report" "node scripts/create-test-users.js --report --primary-only"; then
      ((passed++))
    else
      ((failed++))
      fail "Testbruker-rapport feilet (hull i auth vs profiles)"
    fi
  else
    log "⏭️  Hopper over provision (--skip-provision)"
  fi
  
  # ─────────────────────────────────────────────────────────────────────────────
  # STEG 3: Kritisk E2E med ekte bruker
  # ─────────────────────────────────────────────────────────────────────────────
  log_section "STEG 3: E2E Critical Tests"
  
  export PLAYWRIGHT_TEST_BASE_URL="$BASE_URL"
  export TEST_USER_EMAIL
  export TEST_USER_PASSWORD
  export E2E_USER_EMAIL
  export E2E_USER_PASSWORD
  export KLARPAKKE_E2E_FROM_PROVISION=1
  
  if [[ "$PRODUCTION_MODE" == "0" ]]; then
    # Lokal/staging: start dev-server hvis ikke kjører
    if ! curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/health" 2>/dev/null | grep -q "200\|503"; then
      log "   Dev-server ikke aktiv — starter..."
      npm run dev &
      DEV_PID=$!
      sleep 10
      # Vent på health
      for i in {1..30}; do
        if curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/health" 2>/dev/null | grep -q "200\|503"; then
          break
        fi
        sleep 2
      done
    fi
  fi
  
  ((total++))
  if run_step "e2e-critical-chromium" "npx playwright test --project=critical-chromium"; then
    ((passed++))
  else
    ((failed++))
    fail "E2E Critical (Chromium) feilet"
  fi
  
  # Firefox kun hvis ikke produksjon (raskere feedback)
  if [[ "$PRODUCTION_MODE" == "0" ]]; then
    ((total++))
    if run_step "e2e-critical-firefox" "npx playwright test --project=critical-firefox"; then
      ((passed++))
    else
      ((failed++))
      log "   ⚠️  Firefox-test feilet (ikke-blokkerende i lokal modus)"
    fi
  fi
  
  # ─────────────────────────────────────────────────────────────────────────────
  # STEG 4: Sjekk resultater og trader (diagnose)
  # ─────────────────────────────────────────────────────────────────────────────
  log_section "STEG 4: Diagnose (signals + traders)"
  
  ((total++))
  if run_step "signals-health" "npm run signals:health"; then
    ((passed++))
  else
    ((failed++))
    fail "Signal health check feilet"
  fi
  
  ((total++))
  if run_step "diagnose-signals-traders" "npm run diagnose:signals-traders"; then
    ((passed++))
  else
    ((failed++))
    fail "Diagnose signals+traders feilet"
  fi
  
  ((total++))
  if run_step "diagnose-user-trades" "node scripts/diagnose-user-trades.mjs --email=$TEST_USER_EMAIL"; then
    ((passed++))
  else
    ((failed++))
    log "   ⚠️  User trades diagnose feilet (kan være forventet for ny bruker)"
  fi
  
  # ─────────────────────────────────────────────────────────────────────────────
  # STEG 5: Health gate
  # ─────────────────────────────────────────────────────────────────────────────
  log_section "STEG 5: Health Gate"
  
  if [[ "$PRODUCTION_MODE" == "1" ]]; then
    export HEALTH_URL="$BASE_URL/api/health"
    ((total++))
    if run_step "health-prod-gate" "npm run health:prod:gate"; then
      ((passed++))
    else
      ((failed++))
      fail "Production health gate feilet"
    fi
  else
    ((total++))
    if run_step "health-local-check" "curl -sf ${BASE_URL}/api/health > /dev/null"; then
      ((passed++))
    else
      ((failed++))
      fail "Lokal health check feilet"
    fi
  fi
  
  # ─────────────────────────────────────────────────────────────────────────────
  # STEG 6: Smoke test (hvis tilgjengelig)
  # ─────────────────────────────────────────────────────────────────────────────
  log_section "STEG 6: Smoke Test"
  
  ((total++))
  if run_step "e2e-smoke" "npx playwright test --project=smoke-chromium"; then
    ((passed++))
  else
    ((failed++))
    fail "Smoke test feilet"
  fi
  
  # ═══════════════════════════════════════════════════════════════════════════════
  # OPPSUMMERING
  # ═══════════════════════════════════════════════════════════════════════════════
  
  overall_end=$(date +%s%N)
  overall_duration=$(( (overall_end - overall_start) / 1000000 ))
  
  log_section "OPPSUMMERING"
  
  local exit_code=0
  if [[ "$failed" -gt 0 ]]; then
    log "❌ Watchdog feilet: $failed av $total sjekker feilet"
    exit_code=1
  else
    log "✅ Watchdog OK: Alle $total sjekker bestått"
  fi
  
  finalize_report "$exit_code" "$total" "$passed" "$failed" "$overall_duration"
  
  # Send Slack-varsling hvis feil
  if [[ "$exit_code" -ne 0 ]]; then
    send_alert "$failed sjekker feilet (se $REPORT_FILE)"
  else
    # Send recovery-varsel hvis forrige kjøring feilet
    if [[ -f "$REPORT_DIR/.last_status" ]]; then
      local last_status
      last_status=$(cat "$REPORT_DIR/.last_status")
      if [[ "$last_status" == "failed" ]]; then
        send_alert "Watchdog recovered — alle sjekker OK" "recovered"
      fi
    fi
  fi
  
  # Lagre status for neste kjøring
  echo "$([[ "$exit_code" -eq 0 ]] && echo "passed" || echo "failed")" > "$REPORT_DIR/.last_status"
  
  log ""
  log "Rapport: cat $REPORT_FILE"
  log "Logg:    cat $LOG_FILE"
  
  exit $exit_code
}

# Rens opp dev-server ved exit
cleanup() {
  local ec=$?
  if [[ -n "${DEV_PID:-}" ]]; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
  exit "$ec"
}
trap cleanup EXIT INT TERM

main "$@"
