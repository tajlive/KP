#!/usr/bin/env bash
# Kjør smoke + critical mot next start med watchdog (restart ved crash).
# BASE_URL er http://localhost:PORT — samme vertsnavn som Next sine redirects (unngår 307-loop).
# Bruk: bash scripts/e2e-prod-server-watchdog.sh
#       SKIP_BUILD=1 bash scripts/e2e-prod-server-watchdog.sh   # hvis .next allerede fersk
#
# Krever: npm run build minst én gang før første kjøring (eller utelat SKIP_BUILD).
set -eo pipefail
cd "$(dirname "$0")/.."

# nvm.sh bruker uinitialiserte variabler — ikke bruk `set -u` før etter nvm.
if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "${HOME}/.nvm/nvm.sh"
  nvm use 2>/dev/null || true
fi
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH}"

PORT="${PORT:-3000}"
# Må matche vertsnavn i redirects fra Next (ellers 307-loop mellom 127.0.0.1 og localhost).
export E2E_BASE_URL="${E2E_BASE_URL:-http://localhost:${PORT}}"
export PLAYWRIGHT_TEST_BASE_URL="$E2E_BASE_URL"
export BASE_URL="$E2E_BASE_URL"
export PLAYWRIGHT_SKIP_WEBSERVER=1
export KLARPAKKE_E2E_FROM_PROVISION="${KLARPAKKE_E2E_FROM_PROVISION:-1}"
export PW_WORKERS="${PW_WORKERS:-1}"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=8192}"

TEST_EXIT=0
WATCHDOG_PID=""

ensure_port_free() {
  local p="${1:-$PORT}"
  local round
  for round in 1 2 3 4 5 6 7 8 9 10; do
    local pids
    pids="$(lsof -nP -iTCP:"$p" -sTCP:LISTEN -t 2>/dev/null || true)"
    if [ -z "$pids" ]; then
      return 0
    fi
    echo "… frigjør port $p (PID: $pids)"
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    sleep 1
  done
  echo "❌ Klarte ikke frigjøre port $p"
  exit 1
}

wait_for_health() {
  local i
  for i in $(seq 1 60); do
    local code
    code="$(curl -s -o /dev/null -w "%{http_code}" -m 5 "${E2E_BASE_URL}/api/health" 2>/dev/null || echo "000")"
    if [ "$code" = "200" ] || [ "$code" = "503" ]; then
      echo "✅ App svarer på ${E2E_BASE_URL}/api/health (HTTP $code)"
      return 0
    fi
    sleep 2
    echo "… venter på health ($i/60) …"
  done
  echo "❌ Timeout: ingen svar fra ${E2E_BASE_URL}/api/health"
  return 1
}

cleanup() {
  local ec=$?
  if [ -n "$WATCHDOG_PID" ]; then
    kill "$WATCHDOG_PID" 2>/dev/null || true
    wait "$WATCHDOG_PID" 2>/dev/null || true
  fi
  local pids
  pids="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
  fi
  exit "$ec"
}
trap cleanup EXIT INT TERM

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "🔨 npm run build …"
  npm run build
fi

echo "📋 E2E provision (primær testbruker) …"
npm run test:e2e:prepare

ensure_port_free "$PORT"

echo "🚀 Starter next start (watchdog) på ${E2E_BASE_URL} …"
(
  while true; do
    echo "[watchdog] next start …"
    npm run start -- --port "$PORT" || echo "[watchdog] next start exited $?"
    sleep 2
  done
) &
WATCHDOG_PID=$!

wait_for_health

echo "🧪 Playwright smoke-chromium + critical-chromium …"
npx playwright test --project=smoke-chromium --project=critical-chromium || TEST_EXIT=$?

echo ""
if [ "$TEST_EXIT" -eq 0 ]; then
  echo "✅ E2E fullført (exit 0). Rapport: npx playwright show-report playwright-report"
else
  echo "⚠️ E2E feilet (exit $TEST_EXIT). Rapport: npx playwright show-report playwright-report"
fi

exit "$TEST_EXIT"
