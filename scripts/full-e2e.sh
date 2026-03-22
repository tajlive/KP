#!/usr/bin/env bash
# Full E2E: opprett testbruker, start dev-server, kjør Playwright-prosjekter, stopp server.
# Én kommando – ingen manuell oppstart av server.
#
# Bruk: npm run test:full   eller   bash scripts/full-e2e.sh
#
# Valgfrie miljøvariabler:
#   KP_TEST_FULL_QUALITY=1     — kjør lint + type-check + Vitest før E2E
#   KP_TEST_FULL_DEEP=1        — legg til regression-chromium
#   KP_TEST_FULL_NO_FIREFOX=1  — hopp over critical-firefox
#   KP_TEST_FULL_USERS=primary — kun tom@klarpakke.no (create-test-users --primary-only)
#
# Krever: Supabase URL + SUPABASE_SERVICE_ROLE_KEY i .env / .env.local / … (auto-last av create-test-users.js)
# Sjekk: npm run test:e2e:check-env
#
# Etter feil: npm run test:e2e:agent-brief (leser test-results.json) + playwright-report/
set -e
cd "$(dirname "$0")/.."

if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "${HOME}/.nvm/nvm.sh"
  nvm use 2>/dev/null || true
fi
export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH}"

PORT="${PORT:-3000}"
BASE_URL="http://localhost:${PORT}"
MAX_WAIT=120
DEV_PID=""
TEST_EXIT=0

cleanup() {
  if [ -n "$DEV_PID" ]; then
    echo ""
    echo "🛑 Stopper dev-server (PID $DEV_PID)..."
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
    if command -v lsof >/dev/null 2>&1; then
      lsof -ti :"$PORT" | xargs kill -9 2>/dev/null || true
    fi
  fi
  exit "$TEST_EXIT"
}
trap cleanup EXIT INT TERM

if [ "${KP_TEST_FULL_QUALITY:-0}" = "1" ]; then
  echo "🔍 0. Kvalitet (lint + type-check + unit) — KP_TEST_FULL_QUALITY=1"
  npm run lint
  npm run type-check
  npm run test:unit
  echo ""
fi

echo "📋 1. Oppretter testbrukere i Supabase..."
if [ "${KP_TEST_FULL_USERS:-}" = "primary" ]; then
  echo "   (kun primær — KP_TEST_FULL_USERS=primary)"
  node scripts/create-test-users.js --primary-only
else
  node scripts/create-test-users.js
fi
echo ""

echo "🚀 2. Sjekker om appen allerede kjører på port $PORT..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" 2>/dev/null | grep -q 200; then
  echo "   Appen kjører allerede – bruker den."
else
  echo "   Starter dev-server..."
  npm run dev &
  DEV_PID=$!
  echo "   (PID $DEV_PID)"
  echo ""
  echo "⏳ 3. Venter på at appen er klar (maks ${MAX_WAIT}s)..."
  WAITED=0
  while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" 2>/dev/null | grep -q 200; then
      echo "   Appen svarer på ${BASE_URL}"
      break
    fi
    if [ -n "$DEV_PID" ] && ! kill -0 "$DEV_PID" 2>/dev/null; then
      echo "   ❌ Dev-server stoppet uventet."
      exit 1
    fi
    sleep 3
    WAITED=$((WAITED + 3))
    echo "   ... ${WAITED}s"
  done
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "   ❌ Timeout – appen startet ikke innen ${MAX_WAIT}s."
    exit 1
  fi
fi
echo ""

PW_ARGS=(--project=smoke-chromium --project=critical-chromium)
if [ "${KP_TEST_FULL_NO_FIREFOX:-0}" != "1" ]; then
  PW_ARGS+=(--project=critical-firefox)
else
  echo "ℹ️  Hopper over Firefox (KP_TEST_FULL_NO_FIREFOX=1)"
fi
if [ "${KP_TEST_FULL_DEEP:-0}" = "1" ]; then
  PW_ARGS+=(--project=regression-chromium)
  echo "ℹ️  Deep: inkluderer regression-chromium (KP_TEST_FULL_DEEP=1)"
fi

echo "🧪 4. Kjører E2E (${PW_ARGS[*]})..."
echo "   Live i terminal: list/line fra playwright.config; HTML: playwright-report/"
export TEST_USER_EMAIL="${TEST_USER_EMAIL:-tom@klarpakke.no}"
export TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-TestPassword123!}"
export E2E_USER_EMAIL="${E2E_USER_EMAIL:-$TEST_USER_EMAIL}"
export E2E_USER_PASSWORD="${E2E_USER_PASSWORD:-$TEST_USER_PASSWORD}"
export PLAYWRIGHT_TEST_BASE_URL="$BASE_URL"
export BASE_URL="$BASE_URL"

npx playwright test "${PW_ARGS[@]}" || TEST_EXIT=$?

echo ""
if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ Alle tester fullført. Rapport: npx playwright show-report playwright-report"
else
  echo "⚠️  Noen tester feilet (exit $TEST_EXIT). Rapport: npx playwright show-report playwright-report"
  echo ""
  echo "📋 Agent-brief (lim inn i Cursor Chat):"
  node scripts/playwright-agent-brief.mjs 2>/dev/null || true
fi
exit $TEST_EXIT
